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

async function runSampleTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 2: SAMPLE REGISTRATION & RECEIPT TESTS');
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

  // Inisialisasi HTTP server lokal untuk pengujian Express
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

  // Siapkan JWT tokens untuk berbagai role pengguna nyata di database
  const adminToken = JwtUtil.generateAuthTokens({
    sub: 1,
    username: 'admin',
    role: 'admin',
  }).accessToken;

  const analisToken = JwtUtil.generateAuthTokens({
    sub: 2,
    username: 'rani.d',
    role: 'analis',
  }).accessToken;

  const supervisorToken = JwtUtil.generateAuthTokens({
    sub: 4,
    username: 'supervisor',
    role: 'supervisor',
  }).accessToken;

  const clientFreeportToken = JwtUtil.generateAuthTokens({
    sub: 6,
    username: 'freeport',
    role: 'client',
  }).accessToken;

  const clientAnekaToken = JwtUtil.generateAuthTokens({
    sub: 5,
    username: 'aneka.tm',
    role: 'client',
  }).accessToken;

  // Tracking ID untuk pembersihan data uji
  const createdReceiptIds: number[] = [];
  const createdSampleIds: number[] = [];

  try {
    // -------------------------------------------------------------
    // GROUP 1: Validasi & Keamanan Endpoint (Auth & Validation)
    // -------------------------------------------------------------
    console.log('--- [1. Validasi Zod & Proteksi Autentikasi] ---');

    await executeTest('KEAMANAN', 'GET /api/v1/samples tanpa token ditolak HTTP 401', async () => {
      const res = await request('/api/v1/samples');
      assert(res.status === 401, `Expected status 401, got ${res.status}`);
      assert(res.body.code === 'UNAUTHORIZED', 'Expected code UNAUTHORIZED');
      return '401 Unauthorized terkonfirmasi';
    });

    await executeTest('KEAMANAN', 'POST /api/v1/samples/receipts tanpa token ditolak HTTP 401', async () => {
      const res = await request('/api/v1/samples/receipts', {
        method: 'POST',
        body: JSON.stringify({ klien: 'Test Lab' }),
      });
      assert(res.status === 401, `Expected status 401, got ${res.status}`);
      return '401 Unauthorized terkonfirmasi';
    });

    await executeTest('VALIDASI', 'POST /api/v1/samples/receipts dengan klien kosong ditolak HTTP 400', async () => {
      const res = await request('/api/v1/samples/receipts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({}),
      });
      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.body.code === 'VALIDATION_ERROR', 'Expected code VALIDATION_ERROR');
      return 'Zod validasi field `klien` aktif';
    });

    await executeTest('VALIDASI', 'POST /api/v1/samples dengan jenisMaterial kosong ditolak HTTP 400', async () => {
      const res = await request('/api/v1/samples', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ klien: 'PT. Test' }),
      });
      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.body.code === 'VALIDATION_ERROR', 'Expected code VALIDATION_ERROR');
      return 'Zod validasi field `jenisMaterial` aktif';
    });

    // -------------------------------------------------------------
    // GROUP 2: Role-Based Access Control (RBAC)
    // -------------------------------------------------------------
    console.log('\n--- [2. Otorisasi Role-Based Access Control (RBAC)] ---');

    await executeTest('RBAC', 'Role Client dilarang membuat batch penerimaan (HTTP 403)', async () => {
      const res = await request('/api/v1/samples/receipts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientFreeportToken}` },
        body: JSON.stringify({ klien: 'PT. Freeport Indonesia' }),
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      assert(res.body.code === 'FORBIDDEN', 'Expected code FORBIDDEN');
      return 'Client ditolak membuat penerimaan';
    });

    await executeTest('RBAC', 'Role Client dilarang meregistrasi sampel baru (HTTP 403)', async () => {
      const res = await request('/api/v1/samples', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientFreeportToken}` },
        body: JSON.stringify({ jenisMaterial: 'Konsentrat Tembaga' }),
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return 'Client ditolak registrasi sampel';
    });

    await executeTest('RBAC', 'Role Client dilarang mengakses daftar penerimaan (HTTP 403)', async () => {
      const res = await request('/api/v1/samples/receipts', {
        headers: { Authorization: `Bearer ${clientFreeportToken}` },
      });
      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      return 'Client dilarang melihat daftar penerimaan batch';
    });

    // -------------------------------------------------------------
    // GROUP 3: Alur Penerimaan Batch Sampel (Receipt Management)
    // -------------------------------------------------------------
    console.log('\n--- [3. Pengelolaan Penerimaan Batch Sampel] ---');

    let createdReceiptId = 0;
    let createdReceiptNumber = '';

    await executeTest('PENERIMAAN', 'Pencatatan batch penerimaan baru dengan 2 sampel atomik', async () => {
      const res = await request('/api/v1/samples/receipts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          klien: 'PT. Aneka Tambang',
          jenisMaterial: 'Nikel Laterit',
          metodeUji: 'XRF Benchtop',
          keterangan: 'Sampel eksplorasi Blok B Halmahera',
          samples: [
            { jenisMaterial: 'Nikel Laterit Saprolit', beratGram: 250.5 },
            { jenisMaterial: 'Nikel Laterit Limonit', beratGram: 310.2 },
          ],
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      assert(res.body.data.id > 0, 'Receipt ID harus terisi');
      assert(res.body.data.samples.length === 2, 'Harus ada 2 sampel terbuat');
      assert(res.body.data.nomorPenerimaan.startsWith('REC-'), 'Format nomor penerimaan harus REC-YYMM-XXX');

      createdReceiptId = res.body.data.id;
      createdReceiptNumber = res.body.data.nomorPenerimaan;
      createdReceiptIds.push(createdReceiptId);
      res.body.data.samples.forEach((s: any) => createdSampleIds.push(s.id));

      return `Penerimaan #${createdReceiptNumber} berhasil dibuat dengan 2 sampel`;
    });

    await executeTest('PENERIMAAN', 'Pencegahan duplikasi nomor penerimaan (HTTP 409 CONFLICT)', async () => {
      const res = await request('/api/v1/samples/receipts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          nomorPenerimaan: createdReceiptNumber,
          klien: 'PT. Test Duplikat',
          jenisMaterial: 'Bauksit',
        }),
      });
      assert(res.status === 409, `Expected status 409, got ${res.status}`);
      assert(res.body.code === 'RECEIPT_NUMBER_EXISTS', 'Expected RECEIPT_NUMBER_EXISTS');
      return 'Duplikasi nomor penerimaan ditolak aman';
    });

    await executeTest('PENERIMAAN', 'Daftar batch penerimaan sampel via GET /api/v1/samples/receipts', async () => {
      const res = await request('/api/v1/samples/receipts?limit=5', {
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.data), 'Data harus berupa array');
      assert(res.body.data.pagination.total >= 1, 'Total penerimaan harus >= 1');
      return `Total penerimaan tercatat: ${res.body.data.pagination.total}`;
    });

    await executeTest('PENERIMAAN', 'Detail batch penerimaan via GET /api/v1/samples/receipts/:id', async () => {
      const res = await request(`/api/v1/samples/receipts/${createdReceiptId}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.nomorPenerimaan === createdReceiptNumber, 'Nomor penerimaan harus cocok');
      assert(res.body.data.samples.length === 2, 'Jumlah relasi sampel harus 2');
      return 'Relasi sampel dan detail penerimaan termuat lengkap';
    });

    await executeTest('PENERIMAAN', 'Pembaruan status batch penerimaan oleh Supervisor', async () => {
      const res = await request(`/api/v1/samples/receipts/${createdReceiptId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({ status: 'diproses', isConfirmed: true }),
      });
      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.status === 'diproses', 'Status penerimaan harus menjadi diproses');
      assert(res.body.data.isConfirmed === true, 'isConfirmed harus true');
      return 'Status penerimaan diperbarui ke `diproses` & terkonfirmasi';
    });

    // -------------------------------------------------------------
    // GROUP 4: Registrasi Sampel Satuan & State Machine Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- [4. Registrasi Sampel Satuan & Siklus Hidup (State Machine)] ---');

    let testSampleId = 0;
    let testSampleCode = '';

    await executeTest('SAMPEL', 'Registrasi sampel satuan baru dengan auto-generated kode', async () => {
      const res = await request('/api/v1/samples', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          jenisMaterial: 'Konsentrat Tembaga',
          beratGram: 150.75,
          klien: 'PT. Freeport Indonesia',
          metodeUji: 'AAS / ICP-OES',
          keterangan: 'Sampel uji kadar Cu dan Au Grasberg',
        }),
      });

      assert(res.status === 201, `Expected status 201, got ${res.status}`);
      assert(res.body.data.id > 0, 'Sample ID harus terisi');
      assert(res.body.data.kodeSampel.startsWith('S-'), 'Format kode sampel harus S-YYMM-XXX');
      assert(res.body.data.status === 'antrian', 'Status awal sampel harus antrian');

      testSampleId = res.body.data.id;
      testSampleCode = res.body.data.kodeSampel;
      createdSampleIds.push(testSampleId);

      return `Sampel #${testSampleCode} terdaftar berstatus 'antrian'`;
    });

    await executeTest('STATE_MACHINE', 'Transisi status 1: Analis mulai menguji (antrian -> diuji)', async () => {
      const res = await request(`/api/v1/samples/${testSampleId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          status: 'diuji',
          catatan: 'Sampel masuk tahap preparasi dan digesti asam',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.status === 'diuji', 'Status sampel harus menjadi diuji');
      return `Status sampel berhasil berganti ke 'diuji'`;
    });

    await executeTest('STATE_MACHINE', 'Pelanggaran RBAC: Analis dilarang bypass langsung ke selesai', async () => {
      const res = await request(`/api/v1/samples/${testSampleId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({ status: 'selesai' }),
      });

      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      assert(res.body.code === 'APPROVAL_REQUIRES_SUPERVISOR', 'Expected APPROVAL_REQUIRES_SUPERVISOR');
      return 'Persetujuan akhir dicegah untuk role analis';
    });

    await executeTest('STATE_MACHINE', 'Transisi status 2: Analis ajukan review (diuji -> review)', async () => {
      const res = await request(`/api/v1/samples/${testSampleId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          status: 'review',
          catatan: 'Hasil pengukuran spektrometri selesai, menunggu verifikasi QA/QC',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.status === 'review', 'Status sampel harus menjadi review');
      return `Status sampel berhasil diajukan ke 'review'`;
    });

    await executeTest('STATE_MACHINE', 'Transisi status 3: Supervisor menyetujui sampel (review -> selesai)', async () => {
      const res = await request(`/api/v1/samples/${testSampleId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({
          status: 'selesai',
          catatan: 'Data QA/QC lolos verifikasi standar akreditasi',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.status === 'selesai', 'Status sampel harus menjadi selesai');
      return `Supervisor berhasil approve sampel menjadi 'selesai'`;
    });

    await executeTest('STATE_MACHINE', 'Kunci Status Final: Sampel selesai tidak bisa diubah kembali oleh analis', async () => {
      const res = await request(`/api/v1/samples/${testSampleId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({ status: 'diuji' }),
      });

      assert(res.status === 400, `Expected status 400, got ${res.status}`);
      assert(res.body.code === 'TERMINAL_STATUS_LOCKED', 'Expected TERMINAL_STATUS_LOCKED');
      return 'Sampel selesai terkunci dari perubahan sembarangan';
    });

    // -------------------------------------------------------------
    // GROUP 5: RBAC Scoping untuk Role Klien
    // -------------------------------------------------------------
    console.log('\n--- [5. Pembatasan Akses Multi-Tenant Role Klien] ---');

    await executeTest('CLIENT_SCOPING', 'Klien Freeport hanya dapat melihat sampel miliknya sendiri', async () => {
      const res = await request('/api/v1/samples', {
        headers: { Authorization: `Bearer ${clientFreeportToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      const samples: any[] = res.body.data.data;
      assert(samples.length >= 1, 'Harus ada data sampel milik Freeport');
      for (const s of samples) {
        assert(
          s.klien.toLowerCase().includes('freeport'),
          `Klien lain bocor ke daftar Freeport: ${s.klien}`
        );
      }
      return `Terverifikasi aman: ${samples.length} sampel seluruhnya milik Freeport`;
    });

    await executeTest('CLIENT_SCOPING', 'Klien Freeport dilarang membuka sampel milik PT Aneka Tambang (HTTP 403)', async () => {
      // Sampel di createdSampleIds[0] milik PT Aneka Tambang
      const targetSampleId = createdSampleIds[0];
      const res = await request(`/api/v1/samples/${targetSampleId}`, {
        headers: { Authorization: `Bearer ${clientFreeportToken}` },
      });

      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      assert(res.body.code === 'CLIENT_SAMPLE_ACCESS_DENIED', 'Expected CLIENT_SAMPLE_ACCESS_DENIED');
      return 'Percobaan akses cross-tenant berhasil diblokir';
    });

    await executeTest('CLIENT_SCOPING', 'Klien Aneka Tambang dapat membuka sampel miliknya sendiri', async () => {
      const targetSampleId = createdSampleIds[0];
      const res = await request(`/api/v1/samples/${targetSampleId}`, {
        headers: { Authorization: `Bearer ${clientAnekaToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.id === targetSampleId, 'Data sampel cocok');
      return `Akses sampel milik sendiri sukses (ID: ${targetSampleId})`;
    });

    // -------------------------------------------------------------
    // GROUP 6: Audit Logging Terintegrasi
    // -------------------------------------------------------------
    console.log('\n--- [6. Verifikasi Jejak Audit (Audit Trail log_aktivitas)] ---');

    await executeTest('AUDIT', 'Pencatatan riwayat sampel ke tabel `log_aktivitas` database labmineral', async () => {
      const logs = await prisma.activityLog.findMany({
        where: { modul: 'sampel' },
        orderBy: { id: 'desc' },
        take: 5,
      });

      assert(logs.length >= 3, 'Audit log sampel minimal harus mencatat 3 aktivitas');
      const latestActions = logs.map((l) => l.aksi).join(' | ');
      return `Audit log terkonfirmasi: ${logs.length} entri ditemukan (${latestActions.substring(0, 60)}...)`;
    });

  } finally {
    // Pembersihan data uji secara aman
    console.log('\n--- [Membersihkan Data Uji Secara Aman] ---');
    try {
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
      console.log(`  Pembersihan selesai: ${createdSampleIds.length} sampel uji & ${createdReceiptIds.length} penerimaan uji dihapus.`);
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
  console.log(`TOTAL PENGUJIAN SAMPEL & PENERIMAAN: ${total}`);
  console.log(`PASS: ${passed} | FAIL: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSampleTestSuite().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
