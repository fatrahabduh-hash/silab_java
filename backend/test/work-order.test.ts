import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { JwtUtil } from '../src/modules/auth/utils/jwt.util.js';
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

async function runWorkOrderTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 4: WORK ORDER & LAB ASSIGNMENT TESTS');
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

  // Tokens otentikasi
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
  const createdWoIds: number[] = [];
  const createdReceiptIds: number[] = [];
  const createdSampleIds: number[] = [];

  try {
    // -------------------------------------------------------------
    // GROUP 1: Keamanan & Otorisasi RBAC
    // -------------------------------------------------------------
    console.log('--- [1. Proteksi Otentikasi & Otorisasi RBAC] ---');

    await executeTest('KEAMANAN', 'GET /api/v1/work-orders tanpa token ditolak HTTP 401', async () => {
      const res = await request('/api/v1/work-orders');
      assert(res.status === 401, `Expected status 401, got ${res.status}`);
      return '401 Unauthorized terkonfirmasi';
    });

    await executeTest('RBAC', 'Role Client dilarang mengakses modul Work Order (HTTP 403)', async () => {
      const res = await request('/api/v1/work-orders', {
        headers: { Authorization: `Bearer ${clientToken}` },
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return 'Client ditolak mengakses Work Order internal';
    });

    await executeTest('RBAC', 'Role Analis dilarang menerbitkan Work Order baru (HTTP 403)', async () => {
      const res = await request('/api/v1/work-orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({ mode: 'batch', penerimaanId: 1 }),
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return 'Hanya Admin/Supervisor yang berhak menerbitkan Work Order';
    });

    // -------------------------------------------------------------
    // GROUP 2: Penerbitan Work Order Mode Batch
    // -------------------------------------------------------------
    console.log('\n--- [2. Penerbitan Work Order Mode Batch & Pengikatan Sampel] ---');

    // 2.1 Buat batch penerimaan baru dengan 2 sampel untuk pengujian WO
    const receiptRes = await request('/api/v1/samples/receipts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        klien: 'PT. Vale Indonesia',
        jenisMaterial: 'Nikel Laterit',
        metodeUji: 'XRF Benchtop',
        samples: [
          { jenisMaterial: 'Nikel Saprolit Blok A', beratGram: 300 },
          { jenisMaterial: 'Nikel Limonit Blok B', beratGram: 280 },
        ],
      }),
    });

    assert(receiptRes.status === 201, 'Gagal membuat batch penerimaan uji');
    const testReceiptId = receiptRes.body.data.id;
    createdReceiptIds.push(testReceiptId);
    receiptRes.body.data.samples.forEach((s: any) => createdSampleIds.push(s.id));

    let createdBatchWoId = 0;
    let createdBatchWoNo = '';

    await executeTest('WORK_ORDER', 'Supervisor menerbitkan Work Order Mode Batch (status draft)', async () => {
      const res = await request('/api/v1/work-orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({
          mode: 'batch',
          penerimaanId: testReceiptId,
          analisId: 2, // Rani Dewi
          parameter: 'Ni, Fe, Co, SiO2, MgO',
          metode: 'XRF Benchtop',
          prioritas: 'tinggi',
          jadwalMulai: '2026-09-12 08:00:00',
          jadwalSelesai: '2026-09-12 17:00:00',
          statusAwal: 'draft',
          catatan: 'Pengujian prioritas tinggi target kontrak ekspor',
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      assert(res.body.data.nomorWo.startsWith('WO-'), 'Format nomor WO harus WO-YYMM-XXX');
      assert(res.body.data.status === 'draft', 'Status awal harus draft');
      assert(res.body.data.workOrderSamples.length === 2, 'Harus mengikat 2 sampel batch');

      createdBatchWoId = res.body.data.id;
      createdBatchWoNo = res.body.data.nomorWo;
      createdWoIds.push(createdBatchWoId);

      return `Work Order #${createdBatchWoNo} berhasil diterbitkan mengikat 2 sampel (Status: draft)`;
    });

    await executeTest('WORK_ORDER', 'Pencegahan batch ganda: Batch yang sama ditolak (HTTP 400)', async () => {
      const res = await request('/api/v1/work-orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          mode: 'batch',
          penerimaanId: testReceiptId,
        }),
      });

      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.body.code === 'NO_AVAILABLE_SAMPLES_IN_BATCH', 'Expected NO_AVAILABLE_SAMPLES_IN_BATCH');
      return 'Pencegahan duplikasi alokasi sampel batch aktif';
    });

    // -------------------------------------------------------------
    // GROUP 3: Siklus Transisi Status & Sinkronisasi Sampel
    // -------------------------------------------------------------
    console.log('\n--- [3. Siklus Hidup Work Order & Sinkronisasi Atomik Status Sampel] ---');

    await executeTest('STATE_MACHINE', 'Aktivasi WO (draft -> aktif): Status sampel otomatis menjadi `diuji`', async () => {
      const res = await request(`/api/v1/work-orders/${createdBatchWoId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({
          status: 'aktif',
          catatan: 'Preparasi selesai, pengujian alat XRF dimulai',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.status === 'aktif', 'Status WO harus aktif');

      // Verifikasi di database: seluruh sampel dalam WO harus berstatus 'diuji'
      const checkSamples = await prisma.sample.findMany({
        where: { id: { in: createdSampleIds } },
      });
      for (const s of checkSamples) {
        assert(s.status === 'diuji', `Sampel ${s.kodeSampel} harus berstatus 'diuji', got ${s.status}`);
      }

      return 'WO aktif & seluruh sampel otomatis disinkronkan ke status `diuji`';
    });

    await executeTest('STATE_MACHINE', 'Selesaikan WO (aktif -> selesai): Status sampel otomatis menjadi `selesai`', async () => {
      const res = await request(`/api/v1/work-orders/${createdBatchWoId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({
          status: 'selesai',
          catatan: 'Hasil pembacaan spektrum XRF terverifikasi',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.status === 'selesai', 'Status WO harus selesai');
      assert(res.body.data.selesaiAt !== null, 'selesaiAt harus terisi');

      // Verifikasi sampel di database
      const checkSamples = await prisma.sample.findMany({
        where: { id: { in: createdSampleIds } },
      });
      for (const s of checkSamples) {
        assert(s.status === 'selesai', `Sampel ${s.kodeSampel} harus berstatus 'selesai', got ${s.status}`);
      }

      return 'WO selesai & seluruh sampel otomatis disinkronkan ke status `selesai`';
    });

    await executeTest('STATE_MACHINE', 'Kunci Status Final: WO selesai terkunci dari perubahan status', async () => {
      const res = await request(`/api/v1/work-orders/${createdBatchWoId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({ status: 'aktif' }),
      });

      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.body.code === 'TERMINAL_STATUS_LOCKED', 'Expected TERMINAL_STATUS_LOCKED');
      return 'Terminal status lock terverifikasi aktif';
    });

    // -------------------------------------------------------------
    // GROUP 4: Pembatalan WO & Rollback Status Sampel
    // -------------------------------------------------------------
    console.log('\n--- [4. Pembatalan Work Order & Rollback Status Sampel] ---');

    // Buat sampel mandiri untuk uji pembatalan
    const singleSample = await prisma.sample.create({
      data: {
        kodeSampel: `SMP-WO-CANCEL-${Date.now().toString().slice(-4)}`,
        tanggalMasuk: new Date(),
        jenisMaterial: 'Konsentrat Tembaga',
        status: 'antrian',
      },
    });
    createdSampleIds.push(singleSample.id);

    // Buat WO aktif langsung
    const cancelWoRes = await request('/api/v1/work-orders', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        mode: 'single',
        sampelIds: [singleSample.id],
        parameter: 'Cu, Au',
        statusAwal: 'aktif',
      }),
    });

    assert(cancelWoRes.status === 201, 'Gagal membuat WO mandiri');
    const cancelWoId = cancelWoRes.body.data.id;
    createdWoIds.push(cancelWoId);

    // Sampel harus sudah jadi 'diuji'
    const checkSampleActive = await prisma.sample.findUnique({ where: { id: singleSample.id } });
    assert(checkSampleActive?.status === 'diuji', 'Sampel harusnya diuji');

    await executeTest('ROLLBACK', 'Pembatalan WO me-rollback status sampel kembali ke `antrian`', async () => {
      const res = await request(`/api/v1/work-orders/${cancelWoId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          status: 'dibatalkan',
          catatan: 'Reagen habis, penugasan dibatalkan',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.status === 'dibatalkan', 'Status WO harus dibatalkan');

      // Sampel harus rollback ke 'antrian'
      const checkSampleRollback = await prisma.sample.findUnique({ where: { id: singleSample.id } });
      assert(checkSampleRollback?.status === 'antrian', 'Sampel harus dirollback ke antrian');

      return 'WO dibatalkan & status sampel sukses di-rollback ke `antrian`';
    });

    // -------------------------------------------------------------
    // GROUP 5: Query, Filtering & Detail Work Order
    // -------------------------------------------------------------
    console.log('\n--- [5. Pengambilan & Filter Riwayat Work Order] ---');

    await executeTest('QUERY', 'GET /api/v1/work-orders dengan pagination & filter status', async () => {
      const res = await request('/api/v1/work-orders?status=selesai', {
        headers: { Authorization: `Bearer ${analisToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.data), 'Data harus berupa array');
      assert(res.body.data.pagination.total >= 1, 'Total harus >= 1');
      return `Total WO selesai ditemukan: ${res.body.data.pagination.total}`;
    });

    await executeTest('QUERY', 'GET /api/v1/work-orders/:id memuat detail lengkap dengan sampel', async () => {
      const res = await request(`/api/v1/work-orders/${createdBatchWoId}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.id === createdBatchWoId, 'ID WO harus cocok');
      assert(Array.isArray(res.body.data.workOrderSamples), 'Sampel pivot harus termuat');
      assert(res.body.data.workOrderSamples.length === 2, 'Jumlah sampel harus 2');
      return `Detail WO #${res.body.data.nomorWo} berhasil dimuat dengan 2 sampel relasi`;
    });

    await executeTest('QUERY', 'GET /api/v1/work-orders/available-samples mengembalikan sampel yang bebas WO', async () => {
      const res = await request('/api/v1/work-orders/available-samples', {
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(res.body.data), 'Available samples harus berupa array');
      return `Sampel siap uji ditemukan: ${res.body.data.length} sampel`;
    });

    // -------------------------------------------------------------
    // GROUP 6: Verifikasi Audit Trail
    // -------------------------------------------------------------
    console.log('\n--- [6. Verifikasi Jejak Audit (log_aktivitas)] ---');

    await executeTest('AUDIT', 'Pencatatan riwayat WO ke tabel `log_aktivitas` database labmineral', async () => {
      const logs = await prisma.activityLog.findMany({
        where: {
          aksi: { startsWith: 'WO_' },
        },
        orderBy: { id: 'desc' },
        take: 5,
      });

      assert(logs.length >= 2, 'Minimal harus ada 2 entri log aktivitas Work Order');
      return `Audit log terkonfirmasi: ${logs.length} entri ditemukan (${logs[0].aksi})`;
    });

  } finally {
    // Pembersihan data uji secara aman
    console.log('\n--- [Membersihkan Data Uji Work Order Secara Aman] ---');
    try {
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
      console.log(`  Pembersihan data uji selesai.`);
    } catch (cleanupErr: any) {
      console.error('  Gagal membersihkan data uji:', cleanupErr.message);
    }

    server.close();
    await prisma.$disconnect();
  }

  // Ringkasan
  const total = results.length;
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(`TOTAL PENGUJIAN WORK ORDER & PENUGASAN LAB: ${total}`);
  console.log(`PASS: ${passed} | FAIL: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runWorkOrderTestSuite().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
