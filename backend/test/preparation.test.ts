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

interface TestResult {
  category: string;
  name: string;
  status: 'PASS' | 'FAIL';
  details?: string;
}

const results: TestResult[] = [];

async function runPreparationTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 5: SAMPLE PREPARATION TESTS');
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
  const createdPrepIds: number[] = [];
  const createdWoIds: number[] = [];
  const createdSampleIds: number[] = [];
  const createdReceiptIds: number[] = [];
  const createdBahanIds: number[] = [];
  const createdHasilUjiIds: number[] = [];

  try {
    // -------------------------------------------------------------
    // DATA SEEDING AWAL UNTUK PENGUJIAN
    // -------------------------------------------------------------
    // 1. Batch penerimaan sampel
    const testReceipt = await prisma.sampleReceipt.create({
      data: {
        nomorPenerimaan: 'REC-TEST-PREP-01',
        klien: 'PT Freeport Indonesia',
        tanggalTerima: new Date(),
        jumlahSampel: 3,
        jenisMaterial: 'Konsentrat Tembaga',
        metodeUji: 'XRF & AAS',
        status: 'diproses',
      },
    });
    createdReceiptIds.push(testReceipt.id);

    // 2. Tiga sampel uji
    const sample1 = await prisma.sample.create({
      data: {
        penerimaanId: testReceipt.id,
        kodeSampel: 'SMP-PREP-001',
        tanggalMasuk: new Date(),
        jenisMaterial: 'Konsentrat Tembaga',
        beratGram: 250.5,
        klien: 'PT Freeport Indonesia',
        status: 'antrian',
      },
    });
    createdSampleIds.push(sample1.id);

    const sample2 = await prisma.sample.create({
      data: {
        penerimaanId: testReceipt.id,
        kodeSampel: 'SMP-PREP-002',
        tanggalMasuk: new Date(),
        jenisMaterial: 'Konsentrat Tembaga',
        beratGram: 245.0,
        klien: 'PT Freeport Indonesia',
        status: 'antrian',
      },
    });
    createdSampleIds.push(sample2.id);

    const sample3 = await prisma.sample.create({
      data: {
        penerimaanId: testReceipt.id,
        kodeSampel: 'SMP-PREP-003',
        tanggalMasuk: new Date(),
        jenisMaterial: 'Konsentrat Tembaga',
        beratGram: 260.0,
        klien: 'PT Freeport Indonesia',
        status: 'antrian',
      },
    });
    createdSampleIds.push(sample3.id);

    // 3. Work Order uji
    const testWo = await prisma.workOrder.create({
      data: {
        nomorWo: 'WO-TEST-PREP-01',
        penerimaanId: testReceipt.id,
        lingkupBatch: true,
        analisId: 2,
        prioritas: 'urgent',
        status: 'aktif',
      },
    });
    createdWoIds.push(testWo.id);

    // Tautkan sampel2 dan sampel3 ke WO
    await prisma.workOrderSample.createMany({
      data: [
        { woId: testWo.id, sampelId: sample2.id },
        { woId: testWo.id, sampelId: sample3.id },
      ],
    });

    // 4. Bahan kimia reagen uji
    const testReagen = await prisma.chemicalReagent.create({
      data: {
        kodeBahan: 'B-TEST-HNO3',
        nama: 'Asam Nitrat Uji (HNO3 65%)',
        stok: 500.0,
        satuan: 'mL',
        stokMinimum: 50.0,
      },
    });
    createdBahanIds.push(testReagen.id);

    // -------------------------------------------------------------
    // GROUP 1: Keamanan & Otorisasi RBAC
    // -------------------------------------------------------------
    console.log('--- [1. Proteksi Otentikasi & Otorisasi RBAC] ---');

    await executeTest('KEAMANAN', 'GET /api/v1/preparations tanpa token ditolak HTTP 401', async () => {
      const res = await request('/api/v1/preparations');
      assert(res.status === 401, `Expected status 401, got ${res.status}`);
      return '401 Unauthorized terkonfirmasi';
    });

    await executeTest('RBAC', 'Role Klien dilarang mencatat preparasi (HTTP 403)', async () => {
      const res = await request('/api/v1/preparations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          modeInput: 'single',
          sampelId: sample1.id,
          metodePreparasi: 'destruksi_asam',
        }),
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return '403 Forbidden terkonfirmasi';
    });

    // -------------------------------------------------------------
    // GROUP 2: Validasi Payload
    // -------------------------------------------------------------
    console.log('\n--- [2. Validasi Input Payload (Zod)] ---');

    await executeTest('VALIDASI', 'Penolakan request tanpa sampel target (HTTP 400)', async () => {
      const res = await request('/api/v1/preparations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          modeInput: 'single',
          metodePreparasi: 'destruksi_asam',
        }),
      });
      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      return 'Validasi penolakan tanpa sampelId berhasil';
    });

    await executeTest('VALIDASI', 'Penolakan metode preparasi tidak dikenal (HTTP 400)', async () => {
      const res = await request('/api/v1/preparations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          modeInput: 'single',
          sampelId: sample1.id,
          metodePreparasi: 'metode_ngawur',
        }),
      });
      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      return 'Validasi enum metode preparasi berhasil';
    });

    // -------------------------------------------------------------
    // GROUP 3: Lookup Reagen Kimia Siap Pakai
    // -------------------------------------------------------------
    console.log('\n--- [3. Lookup Inventaris Reagen Kimia] ---');

    await executeTest('REAGEN', 'GET /api/v1/preparations/reagents memuat daftar bahan kimia', async () => {
      const res = await request('/api/v1/preparations/reagents', {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(res.body.data), 'Data reagen harus berupa array');
      const found = res.body.data.some((b: any) => b.kodeBahan === 'B-TEST-HNO3');
      assert(found, 'Reagen uji B-TEST-HNO3 harus tercantum');
      return `Total ${res.body.data.length} reagen ditemukan, termasuk B-TEST-HNO3`;
    });

    // -------------------------------------------------------------
    // GROUP 4: Pencatatan Preparasi Mode Single
    // -------------------------------------------------------------
    console.log('\n--- [4. Pencatatan Preparasi Mode Single] ---');

    await executeTest('SINGLE', 'POST /api/v1/preparations mencatat preparasi 1 sampel dengan QC flags & reagen', async () => {
      const res = await request('/api/v1/preparations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          modeInput: 'single',
          sampelId: sample1.id,
          metodePreparasi: 'destruksi_asam',
          prosedur: 'Destruksi asam tertutup microwave digestion 180°C',
          faktorPengenceran: 2.5,
          volumeAwalMl: 5.0,
          volumeAkhirMl: 50.0,
          blankoDisiapkan: true,
          standarDisiapkan: true,
          spikeDisiapkan: false,
          duplikatDisiapkan: true,
          suhuRuang: 24.5,
          kelembaban: 58.0,
          catatan: 'Preparasi berjalan optimal, larutan jernih kehijauan',
          tanggalPreparasi: '2026-09-11',
          reagen: [
            {
              bahanId: testReagen.id,
              jumlah: 15.0,
              lot: 'LOT-HNO3-2026',
            },
          ],
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const created = res.body.data[0];
      assert(created && created.id, 'Data preparasi harus dikembalikan');
      createdPrepIds.push(created.id);

      assert(created.sampelId === sample1.id, 'ID sampel harus sesuai');
      assert(created.metodePreparasi === 'destruksi_asam', 'Metode preparasi harus destruksi_asam');
      assert(Number(created.faktorPengenceran) === 2.5, 'Faktor pengenceran harus 2.5');
      assert(created.blankoDisiapkan === true, 'Blanko disiapkan harus true');
      assert(created.duplikatDisiapkan === true, 'Duplikat disiapkan harus true');

      // Verifikasi pengurangan stok bahan
      const updatedBahan = await prisma.chemicalReagent.findUnique({
        where: { id: testReagen.id },
      });
      assert(Number(updatedBahan?.stok) === 485.0, `Stok bahan harus 485.0 (500 - 15), got ${updatedBahan?.stok}`);

      // Verifikasi JSON snapshot reagen
      assert(created.reagenDetail !== null, 'Reagen detail snapshot harus ada');
      const parsedReagen = JSON.parse(created.reagenDetail);
      assert(parsedReagen.length === 1 && parsedReagen[0].kode === 'B-TEST-HNO3', 'Snapshot reagen valid');

      return `Preparasi ID #${created.id} tersimpan, stok reagen berkurang 15 mL (sisa: 485 mL)`;
    });

    // -------------------------------------------------------------
    // GROUP 5: Pencatatan Preparasi Mode Batch Work Order
    // -------------------------------------------------------------
    console.log('\n--- [5. Pencatatan Preparasi Mode Batch Work Order] ---');

    await executeTest('BATCH', 'POST /api/v1/preparations mempreparasi seluruh sampel dalam Work Order sekaligus', async () => {
      const res = await request('/api/v1/preparations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          modeInput: 'wo',
          workOrderId: testWo.id,
          metodePreparasi: 'fusion',
          prosedur: 'Peleburan lithium metaborat 1050°C dalam cawan platina',
          faktorPengenceran: 1.0,
          blankoDisiapkan: false,
          standarDisiapkan: true,
          reagen: [
            {
              bahanId: testReagen.id,
              jumlah: 10.0, // 10 mL per sampel × 2 sampel = 20 mL
            },
          ],
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      const list = res.body.data;
      assert(Array.isArray(list) && list.length === 2, `Harus menghasilkan 2 catatan preparasi, got ${list?.length}`);

      for (const item of list) {
        createdPrepIds.push(item.id);
        assert(item.workOrderId === testWo.id, 'Work order ID harus sesuai');
        assert(item.metodePreparasi === 'fusion', 'Metode harus fusion');
      }

      // Verifikasi total pemotongan stok reagen: 485 - (10 * 2) = 465 mL
      const updatedBahan = await prisma.chemicalReagent.findUnique({
        where: { id: testReagen.id },
      });
      assert(Number(updatedBahan?.stok) === 465.0, `Stok bahan harus 465.0, got ${updatedBahan?.stok}`);

      return `Batch sukses: 2 sampel dalam WO dipreparasi, total reagen berkurang 20 mL (sisa: 465 mL)`;
    });

    // -------------------------------------------------------------
    // GROUP 6: Propagasi Faktor Pengenceran ke Hasil Uji (hasil_uji)
    // -------------------------------------------------------------
    console.log('\n--- [6. Propagasi Faktor Pengenceran ke Hasil Uji] ---');

    await executeTest('PROPAGASI', 'Pembaruan faktor pengenceran otomatis mengoreksi nilai di hasil_uji', async () => {
      // Simulasikan hasil uji yang telah ada untuk sample1
      const sample1PrepId = createdPrepIds[0];
      await prisma.$executeRaw`
        INSERT INTO hasil_uji (
          kode_uji, sampel_id, preparasi_id, parameter, nilai, faktor_pengenceran, nilai_terkoreksi, satuan, kesimpulan
        ) VALUES (
          'UJI-TEST-001', ${sample1.id}, ${sample1PrepId}, 'Tembaga (Cu)', 12.5000, 2.5000, 31.2500, '%', 'pending'
        )
      `;

      // Ambil id hasil_uji yang baru di-insert
      const rawRows: any[] = await prisma.$queryRaw`
        SELECT id, nilai, faktor_pengenceran, nilai_terkoreksi FROM hasil_uji WHERE kode_uji = 'UJI-TEST-001'
      `;
      assert(rawRows.length > 0, 'Hasil uji harus berhasil dibuat');
      createdHasilUjiIds.push(rawRows[0].id);

      // Perbarui catatan preparasi dengan faktor pengenceran baru = 4.0
      const res = await request(`/api/v1/preparations/${sample1PrepId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          faktorPengenceran: 4.0,
          catatan: 'Koreksi faktor pengenceran setelah re-dilution ×4',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);

      // Cek apakah hasil_uji terkoreksi secara otomatis
      const updatedRows: any[] = await prisma.$queryRaw`
        SELECT id, nilai, faktor_pengenceran, nilai_terkoreksi FROM hasil_uji WHERE id = ${rawRows[0].id}
      `;
      const hu = updatedRows[0];
      assert(Number(hu.faktor_pengenceran) === 4.0, `Faktor pengenceran hasil uji harus 4.0, got ${hu.faktor_pengenceran}`);
      assert(Number(hu.nilai_terkoreksi) === 50.0, `Nilai terkoreksi harus 50.0 (12.5 × 4), got ${hu.nilai_terkoreksi}`);

      return `Nilai terkoreksi hasil_uji otomatis ter-update menjadi 50.0% (12.5% × 4.0)`;
    });

    // -------------------------------------------------------------
    // GROUP 7: Query & Pagination Riwayat Preparasi
    // -------------------------------------------------------------
    console.log('\n--- [7. Query & Pagination Riwayat Preparasi] ---');

    await executeTest('QUERY', 'GET /api/v1/preparations dengan filter metode=fusion', async () => {
      const res = await request('/api/v1/preparations?metodePreparasi=fusion', {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.items), 'Daftar item harus array');
      assert(res.body.data.items.length >= 2, 'Harus memuat minimal 2 preparasi fusion');
      return `Filter metode fusion mengembalikan ${res.body.data.items.length} catatan`;
    });

    await executeTest('QUERY', 'GET /api/v1/preparations/:id memuat relasi sampel, WO, dan analis', async () => {
      const sample1PrepId = createdPrepIds[0];
      const res = await request(`/api/v1/preparations/${sample1PrepId}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      const data = res.body.data;
      assert(data.id === sample1PrepId, 'ID harus cocok');
      assert(data.sample && data.sample.kodeSampel === 'SMP-PREP-001', 'Relasi sampel valid');
      assert(data.analyst && data.analyst.username, 'Relasi analis valid');
      return `Detail preparasi ID #${data.id} terkonfirmasi dengan relasi sampel ${data.sample.kodeSampel}`;
    });

    // -------------------------------------------------------------
    // GROUP 8: Penghapusan & Jejak Audit (log_aktivitas)
    // -------------------------------------------------------------
    console.log('\n--- [8. Penghapusan Catatan & Jejak Audit (log_aktivitas)] ---');

    await executeTest('DELETE', 'Analis dilarang menghapus preparasi (HTTP 403)', async () => {
      const prepToDelete = createdPrepIds[createdPrepIds.length - 1];
      const res = await request(`/api/v1/preparations/${prepToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return '403 Forbidden terkonfirmasi untuk role analis';
    });

    await executeTest('DELETE', 'Supervisor berwenang menghapus catatan preparasi (HTTP 200)', async () => {
      const prepToDelete = createdPrepIds.pop()!;
      const res = await request(`/api/v1/preparations/${prepToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      return `Preparasi ID #${prepToDelete} sukses dihapus oleh Supervisor`;
    });

    await executeTest('AUDIT', 'Verifikasi pencatatan audit trail pada tabel `log_aktivitas`', async () => {
      const logs = await prisma.activityLog.findMany({
        where: { modul: 'preparasi' },
        orderBy: { id: 'desc' },
        take: 5,
      });

      assert(logs.length >= 3, 'Audit log preparasi harus tercatat minimal 3 entri');
      const hasCreate = logs.some((l) => l.aksi?.includes('PREPARASI_CREATED'));
      const hasUpdate = logs.some((l) => l.aksi?.includes('PREPARASI_UPDATED'));
      const hasDelete = logs.some((l) => l.aksi?.includes('PREPARASI_DELETED'));

      assert(hasCreate, 'Aksi PREPARASI_CREATED harus ada di log');
      assert(hasUpdate, 'Aksi PREPARASI_UPDATED harus ada di log');
      assert(hasDelete, 'Aksi PREPARASI_DELETED harus ada di log');

      return `Audit log terkonfirmasi: ${logs.length} entri ditemukan (CREATE, UPDATE, DELETE)`;
    });

  } finally {
    // -------------------------------------------------------------
    // PEMBERSIHAN DATA UJI SECARA AMAN
    // -------------------------------------------------------------
    console.log('\n--- [Membersihkan Data Uji Preparasi Secara Aman] ---');
    try {
      if (createdHasilUjiIds.length > 0) {
        await prisma.$executeRaw`
          DELETE FROM hasil_uji WHERE id IN (${Prisma.join(createdHasilUjiIds)})
        `;
      }
      if (createdPrepIds.length > 0) {
        await prisma.samplePreparation.deleteMany({
          where: { id: { in: createdPrepIds } },
        });
      }
      if (createdWoIds.length > 0) {
        await prisma.workOrderSample.deleteMany({
          where: { woId: { in: createdWoIds } },
        });
        await prisma.workOrder.deleteMany({
          where: { id: { in: createdWoIds } },
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
      if (createdBahanIds.length > 0) {
        await prisma.chemicalReagent.deleteMany({
          where: { id: { in: createdBahanIds } },
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
  console.log(`TOTAL PENGUJIAN PREPARASI SAMPEL: ${results.length}`);
  console.log(`PASS: ${passCount} | FAIL: ${failCount}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runPreparationTestSuite().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
