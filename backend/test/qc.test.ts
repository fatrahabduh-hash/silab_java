import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { JwtUtil } from '../src/modules/auth/utils/jwt.util.js';
import http from 'http';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

interface TestResultItem {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResultItem[] = [];

async function runQcTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 7: QUALITY CONTROL (QA/QC) TESTS');
  console.log('Lingkungan: Database asli `labmineral` + Live Express Engine');
  console.log('================================================================\n');

  async function executeTest(category: string, name: string, fn: () => Promise<string | void>) {
    try {
      const details = await fn();
      results.push({ category, name, status: 'PASS', details: details || undefined });
      console.log(`  ✔ [${category}] ${name}${details ? ` -> ${details}` : ''}`);
    } catch (err: any) {
      results.push({ category, name, status: 'FAIL', details: err.message });
      console.error(`  ✖ [${category}] ${name} -> FAIL: ${err.message}`);
    }
  }

  // Inisialisasi HTTP server lokal
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  async function request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const body = await res.json().catch(() => null);
    return { status: res.status, headers: res.headers, body };
  }

  // Tokens otentikasi JWT
  const adminToken = JwtUtil.generateAuthTokens({
    sub: 1,
    username: 'admin',
    role: 'admin',
  }).accessToken;

  const supervisorToken = JwtUtil.generateAuthTokens({
    sub: 4,
    username: 'supervisor',
    role: 'supervisor',
  }).accessToken;

  const analisToken = JwtUtil.generateAuthTokens({
    sub: 2,
    username: 'rani.d',
    role: 'analis',
  }).accessToken;

  const clientToken = JwtUtil.generateAuthTokens({
    sub: 6,
    username: 'freeport',
    role: 'client',
  }).accessToken;

  // Tracking IDs untuk pembersihan data uji
  const createdQcIds: number[] = [];
  const createdSampleIds: number[] = [];
  const createdReceiptIds: number[] = [];

  try {
    // -------------------------------------------------------------
    // DATA SEEDING AWAL UNTUK PENGUJIAN
    // -------------------------------------------------------------
    const testReceipt = await prisma.sampleReceipt.create({
      data: {
        nomorPenerimaan: 'REC-TEST-QC-01',
        klien: 'PT Antam Tbk',
        tanggalTerima: new Date(),
        jumlahSampel: 2,
        jenisMaterial: 'Konsentrat Emas & Perak',
        metodeUji: 'Fire Assay & AAS',
        status: 'diproses',
      },
    });
    createdReceiptIds.push(testReceipt.id);

    const sample1 = await prisma.sample.create({
      data: {
        penerimaanId: testReceipt.id,
        kodeSampel: 'SMP-QC-001',
        tanggalMasuk: new Date(),
        jenisMaterial: 'Konsentrat Emas',
        beratGram: 300.0,
        klien: 'PT Antam Tbk',
        status: 'diuji',
      },
    });
    createdSampleIds.push(sample1.id);

    const sample2 = await prisma.sample.create({
      data: {
        penerimaanId: testReceipt.id,
        kodeSampel: 'SMP-QC-002',
        tanggalMasuk: new Date(),
        jenisMaterial: 'Konsentrat Emas',
        beratGram: 310.0,
        klien: 'PT Antam Tbk',
        status: 'diuji',
      },
    });
    createdSampleIds.push(sample2.id);

    // -------------------------------------------------------------
    // GROUP 1: Keamanan & Otorisasi RBAC
    // -------------------------------------------------------------
    console.log('--- [1. Proteksi Otentikasi & Otorisasi RBAC] ---');

    await executeTest('KEAMANAN', 'GET /api/v1/qc tanpa token ditolak HTTP 401', async () => {
      const res = await request('/api/v1/qc');
      assert(res.status === 401, `Expected status 401, got ${res.status}`);
      return '401 Unauthorized terkonfirmasi';
    });

    await executeTest('RBAC', 'Role Klien dilarang menginput catatan QC (HTTP 403)', async () => {
      const res = await request('/api/v1/qc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          sampelId: sample1.id,
          tipeQc: 'standar',
          parameter: 'Emas (Au)',
          nilaiQc: 50.0,
          nilaiExpected: 50,
        }),
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return '403 Forbidden terkonfirmasi untuk role client';
    });

    await executeTest('RBAC', 'Role Analis dilarang mereview QC (Khusus Supervisor/Admin, HTTP 403)', async () => {
      const res = await request('/api/v1/qc/1/review', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          keputusan: 'disetujui',
          catatanReview: 'Review ilegal oleh analis',
        }),
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return '403 Forbidden terkonfirmasi untuk role analis pada review endpoint';
    });

    // -------------------------------------------------------------
    // GROUP 2: Validasi Payload (Zod)
    // -------------------------------------------------------------
    console.log('\n--- [2. Validasi Input Payload (Zod)] ---');

    await executeTest('VALIDASI', 'Penolakan request tanpa sampelId atau tipeQc (HTTP 400)', async () => {
      const res = await request('/api/v1/qc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          parameter: 'Au',
        }),
      });
      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      return 'Validasi penolakan field wajib berhasil';
    });

    // -------------------------------------------------------------
    // GROUP 3: Pendaftaran Standar CRM (Certified Reference Material)
    // -------------------------------------------------------------
    console.log('\n--- [3. Pendaftaran Standar CRM / Nilai Acuan] ---');

    await executeTest('STANDARD', 'POST /api/v1/qc/standard mendaftarkan sampel standar CRM', async () => {
      const res = await request('/api/v1/qc/standard', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          sampelKey: 'CRM-OREAS-254',
          parameter: 'Emas (Au)',
          nilaiSertifikat: 50,
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const data = res.body.data;
      assert(data && data.id, 'Data QC standar harus dibuat');
      createdQcIds.push(data.id);
      if (data.sample?.id) createdSampleIds.push(data.sample.id);

      assert(data.tipeQc === 'standar', 'Tipe QC harus standar');
      assert(data.nilaiExpected === 50, 'Nilai expected harus 50');
      return `Standar CRM ${data.sample?.kodeSampel} terdaftar dengan nilai acuan 50 ppm`;
    });

    // -------------------------------------------------------------
    // GROUP 4: Kalkulasi % Recovery & Evaluasi Bendera Mutu (Flag)
    // -------------------------------------------------------------
    console.log('\n--- [4. Kalkulasi % Recovery & Evaluasi Flag Mutu] ---');

    await executeTest('RECOVERY', 'QC Standar dengan recovery ideal (98.0%) mendapatkan flag PASS', async () => {
      // expected = 50, qc = 49.0 -> recovery = 98.0% (antara 85 - 115%, tidak dekat batas)
      const res = await request('/api/v1/qc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          sampelId: sample1.id,
          tipeQc: 'standar',
          parameter: 'Emas (Au)',
          nilaiQc: 49.0,
          nilaiExpected: 50,
          satuan: 'g/t',
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const data = res.body.data;
      createdQcIds.push(data.id);

      assert(Number(data.persenRecovery) === 98.0, `Recovery harus 98.0%, got ${data.persenRecovery}`);
      assert(data.flag === 'pass', `Flag harus 'pass', got ${data.flag}`);
      assert(data.statusQc === 'pending', 'Status QC awal harus pending');

      return `Recovery 98.0% -> Flag: ${data.flag.toUpperCase()}`;
    });

    await executeTest('RECOVERY', 'QC Spike dengan recovery melampaui batas (130.0%) mendapatkan flag FAIL', async () => {
      // expected = 50, qc = 65.0 -> recovery = 130.0% (> 115%)
      const res = await request('/api/v1/qc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          sampelId: sample1.id,
          tipeQc: 'spike',
          parameter: 'Emas (Au)',
          nilaiQc: 65.0,
          nilaiExpected: 50,
          satuan: 'g/t',
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const data = res.body.data;
      createdQcIds.push(data.id);

      assert(Number(data.persenRecovery) === 130.0, `Recovery harus 130.0%, got ${data.persenRecovery}`);
      assert(data.flag === 'fail', `Flag harus 'fail', got ${data.flag}`);

      return `Recovery 130.0% (melebihi 115%) -> Flag: ${data.flag.toUpperCase()}`;
    });

    await executeTest('RECOVERY', 'QC Standar dengan recovery marjinal (113.0%) mendapatkan flag WARNING', async () => {
      // expected = 100, qc = 113.0 -> recovery = 113.0% (110% - 115% rentang warning atas)
      const res = await request('/api/v1/qc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          sampelId: sample2.id,
          tipeQc: 'standar',
          parameter: 'Perak (Ag)',
          nilaiQc: 113.0,
          nilaiExpected: 100,
          satuan: 'g/t',
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const data = res.body.data;
      createdQcIds.push(data.id);

      assert(Number(data.persenRecovery) === 113.0, `Recovery harus 113.0%, got ${data.persenRecovery}`);
      assert(data.flag === 'warning', `Flag harus 'warning', got ${data.flag}`);

      return `Recovery 113.0% (marjinal toleransi) -> Flag: ${data.flag.toUpperCase()}`;
    });

    await executeTest('BLANKO', 'QC Blanko tanpa kontaminasi (nilai <= 0.05) mendapatkan flag PASS', async () => {
      const res = await request('/api/v1/qc', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          sampelId: sample1.id,
          tipeQc: 'blanko',
          parameter: 'Emas (Au)',
          nilaiQc: 0.01,
          satuan: 'g/t',
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const data = res.body.data;
      createdQcIds.push(data.id);

      assert(data.tipeQc === 'blanko', 'Tipe QC harus blanko');
      assert(data.flag === 'pass', `Flag blanko harus 'pass', got ${data.flag}`);

      return `Nilai blanko 0.01 g/t di bawah ambang batas deteksi -> Flag: ${data.flag.toUpperCase()}`;
    });

    // -------------------------------------------------------------
    // GROUP 5: Alur Review & Pengesahan Mutu (Supervisor)
    // -------------------------------------------------------------
    console.log('\n--- [5. Alur Review & Validasi Supervisor] ---');

    await executeTest('REVIEW', 'Supervisor menyetujui data QC (status: disetujui)', async () => {
      const targetId = createdQcIds[1]; // QC Standar pass
      const res = await request(`/api/v1/qc/${targetId}/review`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({
          keputusan: 'disetujui',
          catatanReview: 'Recovery 98.0% memenuhi kriteria ISO 17025',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      const data = res.body.data;
      assert(data.statusQc === 'disetujui', `Status QC harus 'disetujui', got ${data.statusQc}`);
      assert(data.reviewerId === 4, 'Reviewer ID harus ID supervisor (4)');

      return `QC ID #${targetId} disetujui oleh Supervisor (catatan: ${data.catatanReview})`;
    });

    await executeTest('REVIEW', 'Supervisor menolak data QC dengan flag fail (status: ditolak)', async () => {
      const targetId = createdQcIds[2]; // QC Spike fail
      const res = await request(`/api/v1/qc/${targetId}/review`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({
          keputusan: 'ditolak',
          catatanReview: 'Recovery 130% melampaui batas keberterimaan spike, uji ulang preparasi',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      const data = res.body.data;
      assert(data.statusQc === 'ditolak', `Status QC harus 'ditolak', got ${data.statusQc}`);

      return `QC ID #${targetId} ditolak oleh Supervisor (catatan: ${data.catatanReview})`;
    });

    // -------------------------------------------------------------
    // GROUP 6: Statistik Dasbor Mutu QC
    // -------------------------------------------------------------
    console.log('\n--- [6. Statistik Dasbor Mutu QC] ---');

    await executeTest('STATS', 'GET /api/v1/qc/stats menghasilkan ringkasan metrik mutu', async () => {
      const res = await request('/api/v1/qc/stats', {
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      const stats = res.body.data;
      assert(stats.total >= 5, 'Total QC minimal 5');
      assert(stats.pass >= 2, 'Total pass minimal 2');
      assert(stats.fail >= 1, 'Total fail minimal 1');
      assert(stats.warning >= 1, 'Total warning minimal 1');
      assert(stats.disetujui >= 1, 'Total disetujui minimal 1');
      assert(stats.ditolak >= 1, 'Total ditolak minimal 1');
      assert(stats.byType && stats.byType.blanko >= 1, 'Rincian blanko ada');

      return `Statistik: ${stats.total} total QC (Pass: ${stats.pass}, Fail: ${stats.fail}, Warning: ${stats.warning}, Disetujui: ${stats.disetujui}, Ditolak: ${stats.ditolak})`;
    });

    // -------------------------------------------------------------
    // GROUP 7: Query, Filter & Hapus Data QC
    // -------------------------------------------------------------
    console.log('\n--- [7. Query, Filter & Hapus Data QC] ---');

    await executeTest('QUERY', 'GET /api/v1/qc dengan filter flag=fail', async () => {
      const res = await request('/api/v1/qc?flag=fail', {
        headers: { Authorization: `Bearer ${analisToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      const items = res.body.data.items;
      assert(Array.isArray(items), 'Items harus berupa array');
      const allFail = items.every((i: any) => i.flag === 'fail');
      assert(allFail, 'Semua item hasil filter harus memiliki flag fail');

      return `Filter flag=fail mengembalikan ${items.length} catatan QC bermasalah`;
    });

    await executeTest('DELETE', 'Supervisor menghapus catatan QC (HTTP 200)', async () => {
      const toDelete = createdQcIds.pop()!;
      const res = await request(`/api/v1/qc/${toDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      return `Catatan QC ID #${toDelete} berhasil dihapus oleh Supervisor`;
    });

    // -------------------------------------------------------------
    // GROUP 8: Jejak Audit (log_aktivitas)
    // -------------------------------------------------------------
    console.log('\n--- [8. Verifikasi Jejak Audit Trail (log_aktivitas)] ---');

    await executeTest('AUDIT', 'Pencatatan riwayat QC ke tabel `log_aktivitas`', async () => {
      const logs = await prisma.activityLog.findMany({
        where: { modul: 'qc' },
        orderBy: { id: 'desc' },
        take: 8,
      });

      assert(logs.length >= 4, 'Audit log QC harus memuat minimal 4 entri');
      const hasRecord = logs.some((l) => l.aksi?.includes('QC_RECORDED'));
      const hasReview = logs.some((l) => l.aksi?.includes('QC_REVIEWED'));
      const hasDelete = logs.some((l) => l.aksi?.includes('QC_DELETED'));

      assert(hasRecord, 'Log QC_RECORDED harus tercatat');
      assert(hasReview, 'Log QC_REVIEWED harus tercatat');
      assert(hasDelete, 'Log QC_DELETED harus tercatat');

      return `Audit log terkonfirmasi: ${logs.length} entri ditemukan (RECORD, REVIEW, DELETE)`;
    });

  } finally {
    // -------------------------------------------------------------
    // PEMBERSIHAN DATA UJI SECARA AMAN
    // -------------------------------------------------------------
    console.log('\n--- [Membersihkan Data Uji QC Secara Aman] ---');
    try {
      if (createdQcIds.length > 0) {
        await prisma.qcSample.deleteMany({
          where: { id: { in: createdQcIds } },
        });
      }
      if (createdSampleIds.length > 0) {
        await prisma.sample.deleteMany({
          where: { id: { in: createdSampleIds } },
        });
      }
      if (createdReceiptIds.length > 0) {
        await prisma.sampleReceipt.deleteMany({
          where: { id: { in: createdReceiptIds } },
        });
      }
      console.log('  Pembersihan data uji selesai.');
    } catch (cleanErr: any) {
      console.error('  Pembersihan parsial error:', cleanErr.message);
    }

    server.close();
  }

  // Ringkasan
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(`TOTAL PENGUJIAN QUALITY CONTROL (QC): ${results.length}`);
  console.log(`PASS: ${passCount} | FAIL: ${failCount}`);
  if (failCount > 0) {
    console.log('--- RINCIAN KEGAGALAN: ---');
    results.filter((r) => r.status === 'FAIL').forEach((r) => {
      console.log(`  ✖ [${r.category}] ${r.name}: ${r.details}`);
    });
  }
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runQcTestSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
