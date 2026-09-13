import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { JwtUtil } from '../src/modules/auth/utils/jwt.util.js';
import { Prisma } from '@prisma/client';
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

async function runTestResultTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 6: TESTING & RESULTS ACQUISITION TESTS');
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
  const createdTestResultIds: number[] = [];
  const createdPrepIds: number[] = [];
  const createdSampleIds: number[] = [];
  const createdReceiptIds: number[] = [];

  try {
    // -------------------------------------------------------------
    // DATA SEEDING AWAL UNTUK PENGUJIAN
    // -------------------------------------------------------------
    // 1. Batch penerimaan sampel
    const testReceipt = await prisma.sampleReceipt.create({
      data: {
        nomorPenerimaan: 'REC-TEST-P6-01',
        klien: 'PT Vale Indonesia',
        tanggalTerima: new Date(),
        jumlahSampel: 2,
        jenisMaterial: 'Bijih Nikel Laterit',
        metodeUji: 'XRF & AAS',
        status: 'diproses',
      },
    });
    createdReceiptIds.push(testReceipt.id);

    // 2. Dua sampel uji
    const sample1 = await prisma.sample.create({
      data: {
        penerimaanId: testReceipt.id,
        kodeSampel: 'SMP-P6-001',
        tanggalMasuk: new Date(),
        jenisMaterial: 'Bijih Nikel Laterit',
        beratGram: 200.0,
        klien: 'PT Vale Indonesia',
        status: 'diuji',
      },
    });
    createdSampleIds.push(sample1.id);

    const sample2 = await prisma.sample.create({
      data: {
        penerimaanId: testReceipt.id,
        kodeSampel: 'SMP-P6-002',
        tanggalMasuk: new Date(),
        jenisMaterial: 'Bijih Nikel Laterit',
        beratGram: 180.5,
        klien: 'PT Vale Indonesia',
        status: 'diuji',
      },
    });
    createdSampleIds.push(sample2.id);

    // 3. Catatan preparasi sampel untuk sample1 (faktor pengenceran 2.5)
    const testPrep1 = await prisma.samplePreparation.create({
      data: {
        sampelId: sample1.id,
        metodePreparasi: 'destruksi_asam',
        prosedur: 'Digestion HClO4-HNO3',
        faktorPengenceran: new Prisma.Decimal(2.5),
        volumeAwalMl: new Prisma.Decimal(5.0),
        volumeAkhirMl: new Prisma.Decimal(50.0),
        blankoDisiapkan: true,
        analisId: 2,
      },
    });
    createdPrepIds.push(testPrep1.id);

    // -------------------------------------------------------------
    // GROUP 1: Keamanan & Otorisasi RBAC
    // -------------------------------------------------------------
    console.log('--- [1. Proteksi Otentikasi & Otorisasi RBAC] ---');

    await executeTest('KEAMANAN', 'GET /api/v1/test-results tanpa token ditolak HTTP 401', async () => {
      const res = await request('/api/v1/test-results');
      assert(res.status === 401, `Expected status 401, got ${res.status}`);
      return '401 Unauthorized terkonfirmasi';
    });

    await executeTest('RBAC', 'Role Klien dilarang menginput hasil uji (HTTP 403)', async () => {
      const res = await request('/api/v1/test-results', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          sampelId: sample1.id,
          parameter: 'Nikel (Ni)',
          nilai: 1.85,
        }),
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return '403 Forbidden terkonfirmasi untuk role client';
    });

    // -------------------------------------------------------------
    // GROUP 2: Validasi Payload
    // -------------------------------------------------------------
    console.log('\n--- [2. Validasi Input Payload (Zod)] ---');

    await executeTest('VALIDASI', 'Penolakan request tanpa parameter dan nilai (HTTP 400)', async () => {
      const res = await request('/api/v1/test-results', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          sampelId: sample1.id,
        }),
      });
      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      return 'Validasi penolakan field wajib berhasil';
    });

    await executeTest('VALIDASI', 'Penolakan batch request dengan array rows kosong (HTTP 400)', async () => {
      const res = await request('/api/v1/test-results/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          rows: [],
        }),
      });
      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      return 'Validasi min(1) rows pada batch acquisition berhasil';
    });

    // -------------------------------------------------------------
    // GROUP 3: Input Hasil Uji Tunggal & Kalkulasi Nilai Terkoreksi
    // -------------------------------------------------------------
    console.log('\n--- [3. Input Hasil Uji Tunggal & Kalkulasi Otomatis] ---');

    await executeTest('SINGLE', 'POST /api/v1/test-results dengan auto-link preparasi & nilai terkoreksi', async () => {
      // Nilai mentah = 2.0. Preparasi sampel memiliki faktor = 2.5.
      // Nilai terkoreksi harus = 2.0 * 2.5 = 5.0%.
      // Batas maksimum = 4.0%. Karena 5.0 > 4.0, kesimpulan harus otomatis 'tidak_lulus'.
      const res = await request('/api/v1/test-results', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          sampelId: sample1.id,
          parameter: 'Besi (Fe)',
          nilai: 2.0,
          satuan: '%',
          metode: 'AAS',
          batasMin: 0.1,
          batasMaks: 4.0,
          catatan: 'Analisis serapan atom nyala udara-asetilena',
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const data = res.body.data;
      assert(data && data.id, 'Data hasil uji harus dikembalikan');
      createdTestResultIds.push(data.id);

      assert(data.kodeUji.startsWith('U-'), 'Kode uji harus berformat U-XXX');
      assert(data.preparasiId === testPrep1.id, 'Preparasi ID harus otomatis tertaut');
      assert(Number(data.faktorPengenceran) === 2.5, 'Faktor pengenceran harus diambil dari preparasi (2.5)');
      assert(Number(data.nilaiTerkoreksi) === 5.0, `Nilai terkoreksi harus 5.0 (2.0 × 2.5), got ${data.nilaiTerkoreksi}`);
      assert(data.kesimpulan === 'tidak_lulus', `Kesimpulan harus 'tidak_lulus' karena melebihi batasMaks 4.0, got ${data.kesimpulan}`);

      // Status sampel harus otomatis beralih ke 'review' atau 'selesai' (via trigger database)
      const updatedSample1 = await prisma.sample.findUnique({ where: { id: sample1.id } });
      assert(
        updatedSample1?.status === 'review' || updatedSample1?.status === 'selesai',
        `Status sampel harus 'review' atau 'selesai', got ${updatedSample1?.status}`
      );

      return `Kode ${data.kodeUji}: nilai terkoreksi 5.0% (${data.kesimpulan}), status sampel beralih ke ${updatedSample1?.status}`;
    });

    await executeTest('SINGLE', 'POST /api/v1/test-results dengan kesimpulan mutu memenuhi syarat (lulus)', async () => {
      // Nilai mentah = 1.6%. Batas min = 1.0%, batas maks = 2.5%.
      // Kesimpulan harus otomatis 'lulus'.
      const res = await request('/api/v1/test-results', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          sampelId: sample1.id,
          parameter: 'Nikel (Ni)',
          nilai: 1.6,
          faktorPengenceran: 1.0,
          satuan: '%',
          metode: 'XRF',
          batasMin: 1.0,
          batasMaks: 2.5,
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const data = res.body.data;
      createdTestResultIds.push(data.id);

      assert(Number(data.nilaiTerkoreksi) === 1.6, 'Nilai terkoreksi harus 1.6');
      assert(data.kesimpulan === 'lulus', `Kesimpulan harus 'lulus', got ${data.kesimpulan}`);
      return `Parameter Ni: 1.6% memenuhi ambang batas 1.0 - 2.5% (status: ${data.kesimpulan})`;
    });

    // -------------------------------------------------------------
    // GROUP 4: Batch Acquisition (Kolektif Multi-Sampel)
    // -------------------------------------------------------------
    console.log('\n--- [4. Input Hasil Uji Batch Kolektif Multi-Sampel] ---');

    await executeTest('BATCH', 'POST /api/v1/test-results/batch mencatat multi-parameter sampel sekaligus', async () => {
      const res = await request('/api/v1/test-results/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          metode: 'XRF',
          satuan: '%',
          rows: [
            {
              sampelId: sample2.id,
              parameter: 'Nikel (Ni)',
              nilai: 1.72,
              batasMin: 1.0,
              batasMaks: 2.5,
            },
            {
              sampelId: sample2.id,
              parameter: 'Kobalt (Co)',
              nilai: 0.08,
              batasMin: 0.01,
              batasMaks: 0.2,
            },
            {
              sampelId: sample2.id,
              parameter: 'Silika (SiO2)',
              nilai: 38.4,
            },
          ],
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const list = res.body.data;
      assert(Array.isArray(list) && list.length === 3, `Harus menghasilkan 3 catatan pengujian, got ${list?.length}`);

      for (const item of list) {
        createdTestResultIds.push(item.id);
        assert(item.kodeUji.startsWith('U-'), 'Setiap kode uji batch harus diawali U-');
      }

      // Verifikasi sampel2 juga berubah status ke 'review' atau 'selesai'
      const updatedSample2 = await prisma.sample.findUnique({ where: { id: sample2.id } });
      assert(
        updatedSample2?.status === 'review' || updatedSample2?.status === 'selesai',
        `Status sampel2 harus 'review' atau 'selesai', got ${updatedSample2?.status}`
      );

      // Karena sample1 dan sample2 keduanya telah berstatus 'review'/'selesai', penerimaan_sampel harus otomatis sinkron ke 'selesai'
      const updatedReceipt = await prisma.sampleReceipt.findUnique({ where: { id: testReceipt.id } });
      assert(updatedReceipt?.status === 'selesai', `Status penerimaan batch harus tersinkron 'selesai', got ${updatedReceipt?.status}`);

      return `Batch 3 parameter berhasil disimpan, batch penerimaan REC-TEST-P6-01 otomatis tersinkronkan 'selesai'`;
    });

    // -------------------------------------------------------------
    // GROUP 5: Query & Pagination Riwayat Hasil Uji
    // -------------------------------------------------------------
    console.log('\n--- [5. Query & Pagination Riwayat Hasil Uji] ---');

    await executeTest('QUERY', 'GET /api/v1/test-results dengan filter kesimpulan=tidak_lulus', async () => {
      const res = await request('/api/v1/test-results?kesimpulan=tidak_lulus', {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.items), 'Daftar items harus array');
      const found = res.body.data.items.some((item: any) => item.parameter === 'Besi (Fe)');
      assert(found, 'Parameter Besi (Fe) yang tidak lulus harus ditemukan');
      return `Filter kesimpulan=tidak_lulus sukses mengembalikan parameter Besi (Fe)`;
    });

    await executeTest('QUERY', 'GET /api/v1/test-results/:id memuat detail lengkap dengan relasi sampel & analis', async () => {
      const firstId = createdTestResultIds[0];
      const res = await request(`/api/v1/test-results/${firstId}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      const data = res.body.data;
      assert(data.id === firstId, 'ID hasil uji harus sesuai');
      assert(data.sample && data.sample.kodeSampel === 'SMP-P6-001', 'Relasi sampel valid');
      assert(data.analyst && data.analyst.username === 'rani.d', 'Relasi analis valid');
      return `Detail ID #${data.id} (${data.kodeUji}) memuat sampel ${data.sample.kodeSampel} & analis ${data.analyst.username}`;
    });

    // -------------------------------------------------------------
    // GROUP 6: Update, Delete & Rollback Status
    // -------------------------------------------------------------
    console.log('\n--- [6. Update, Delete & Rollback Status Sampel] ---');

    await executeTest('UPDATE', 'PATCH /api/v1/test-results/:id mengoreksi nilai & otomatis mengevaluasi kesimpulan', async () => {
      // Ubah nilai Besi (Fe) dari 2.0 menjadi 1.2.
      // Nilai terkoreksi baru = 1.2 * 2.5 = 3.0%.
      // Karena 3.0 berada dalam batasMin (0.1) dan batasMaks (4.0), kesimpulan harus otomatis berubah jadi 'lulus'!
      const firstId = createdTestResultIds[0];
      const res = await request(`/api/v1/test-results/${firstId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          nilai: 1.2,
          catatan: 'Koreksi penimbangan ulang sampel digest',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      const data = res.body.data;
      assert(Number(data.nilai) === 1.2, 'Nilai harus terupdate menjadi 1.2');
      assert(Number(data.nilaiTerkoreksi) === 3.0, `Nilai terkoreksi harus 3.0 (1.2 × 2.5), got ${data.nilaiTerkoreksi}`);
      assert(data.kesimpulan === 'lulus', `Kesimpulan harus berubah menjadi 'lulus', got ${data.kesimpulan}`);

      return `Nilai dikoreksi menjadi 1.2%, nilai terkoreksi 3.0%, kesimpulan otomatis beralih menjadi 'lulus'`;
    });

    await executeTest('DELETE', 'Analis dilarang menghapus hasil uji (HTTP 403)', async () => {
      const lastId = createdTestResultIds[createdTestResultIds.length - 1];
      const res = await request(`/api/v1/test-results/${lastId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return '403 Forbidden terkonfirmasi untuk role analis';
    });

    await executeTest('DELETE', 'Supervisor menghapus hasil uji laboratorium (HTTP 200)', async () => {
      const lastId = createdTestResultIds.pop()!;
      const res = await request(`/api/v1/test-results/${lastId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      return `Hasil uji ID #${lastId} sukses dihapus oleh Supervisor`;
    });

    await executeTest('AUDIT', 'Verifikasi jejak audit trail pada tabel `log_aktivitas`', async () => {
      const logs = await prisma.activityLog.findMany({
        where: { modul: 'pengujian' },
        orderBy: { id: 'desc' },
        take: 6,
      });

      assert(logs.length >= 4, 'Audit log pengujian harus tercatat minimal 4 entri');
      const hasCreate = logs.some((l) => l.aksi?.includes('HASIL_UJI_CREATED'));
      const hasBatch = logs.some((l) => l.aksi?.includes('HASIL_UJI_BATCH_CREATED'));
      const hasUpdate = logs.some((l) => l.aksi?.includes('HASIL_UJI_UPDATED'));
      const hasDelete = logs.some((l) => l.aksi?.includes('HASIL_UJI_DELETED'));

      assert(hasCreate, 'Aksi HASIL_UJI_CREATED harus ada di log');
      assert(hasBatch, 'Aksi HASIL_UJI_BATCH_CREATED harus ada di log');
      assert(hasUpdate, 'Aksi HASIL_UJI_UPDATED harus ada di log');
      assert(hasDelete, 'Aksi HASIL_UJI_DELETED harus ada di log');

      return `Audit log terkonfirmasi: ${logs.length} entri ditemukan (CREATE, BATCH, UPDATE, DELETE)`;
    });

  } finally {
    // -------------------------------------------------------------
    // PEMBERSIHAN DATA UJI SECARA AMAN
    // -------------------------------------------------------------
    console.log('\n--- [Membersihkan Data Uji Pengujian Secara Aman] ---');
    try {
      if (createdTestResultIds.length > 0) {
        await prisma.testResult.deleteMany({
          where: { id: { in: createdTestResultIds } },
        });
      }
      if (createdPrepIds.length > 0) {
        await prisma.samplePreparation.deleteMany({
          where: { id: { in: createdPrepIds } },
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
  console.log(`TOTAL PENGUJIAN HASIL UJI LABORATORIUM: ${results.length}`);
  console.log(`PASS: ${passCount} | FAIL: ${failCount}`);
  if (failCount > 0) {
    console.log('--- RINCIAN KEGAGALAN: ---');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ✖ [${r.category}] ${r.name}: ${r.details}`);
    });
  }
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestResultTestSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
