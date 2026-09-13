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

async function runSubmissionTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 10: CLIENT PORTAL & SUBMISSIONS (SSF) TESTS');
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

  const createdSubmissionIds: number[] = [];
  const createdReceiptIds: number[] = [];
  const createdAccessKeys: string[] = [];

  try {
    console.log('--- [1. Statistik Permohonan Sampel (SSF)] ---');
    await executeTest('STATS', 'GET /api/v1/submissions/stats memuat ringkasan status permohonan', async () => {
      const res = await request('/api/v1/submissions/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.status === 'success', 'Response status harus success');
      const data = res.body.data;
      assert(typeof data.total === 'number', 'Field total harus number');
      assert(typeof data.pending === 'number', 'Field pending harus number');
      return `Total submissions: ${data.total} (Pending: ${data.pending}, Diterima: ${data.diterima})`;
    });

    console.log('\n--- [2. Pendaftaran Permohonan Sampel Mandiri (SSF)] ---');
    let testSubId1 = 0;
    let testNomorSub1 = '';
    let testKodeAkses1 = '';

    await executeTest('CREATE_SSF', 'Klien mengirim formulir permohonan sampel baru (HTTP 201)', async () => {
      const res = await request('/api/v1/submissions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          klien: 'PT Vale Indonesia Tbk',
          kontakPerson: 'Ir. Hendra Gunawan',
          email: 'hendra.gunawan@vale.co.id',
          telepon: '081234567890',
          alamat: 'Sorowako, Luwu Timur, Sulawesi Selatan',
          poReferensi: 'PO-VALE-2026-0901',
          instruksiKhusus: 'Uji prioritas kadar Ni dan Fe untuk shipment ekspor',
          catatan: 'Sampel dikirim melalui kurir kargo udara',
          samples: [
            {
              jenisMaterial: 'Laterite Nickel Ore High Grade',
              beratGram: 500.0,
              metodeUji: 'XRF Pressed Pellet',
              parameter: 'Ni, Fe, Co, SiO2, MgO',
              keterangan: 'Titik bor Pit B1-Level 4',
            },
            {
              jenisMaterial: 'Limonite Nickel Ore',
              beratGram: 450.0,
              metodeUji: 'XRF Pressed Pellet',
              parameter: 'Ni, Fe, Sc',
              keterangan: 'Titik bor Pit C2-Level 2',
            },
          ],
        }),
      });

      assert(res.status === 201, `HTTP status harus 201, didapat ${res.status}`);
      const data = res.body.data;
      assert(data.nomorSubmission.startsWith('SSF-'), 'Nomor submission harus diawali SSF-');
      assert(data.status === 'pending', 'Status awal harus pending');
      assert(data.details.length === 2, 'Jumlah sampel detail harus 2');
      assert(Boolean(data.kodeAkses), 'Kode akses tracking harus terbit');

      testSubId1 = data.id;
      testNomorSub1 = data.nomorSubmission;
      testKodeAkses1 = data.kodeAkses;
      createdSubmissionIds.push(testSubId1);
      createdAccessKeys.push(testKodeAkses1);

      return `Permohonan ${testNomorSub1} terdaftar [Kode Akses: ${testKodeAkses1}]`;
    });

    console.log('\n--- [3. Pelacakan Publik Tanpa Login (Public Tracking)] ---');
    await executeTest('TRACK_PUBLIC', `GET /api/v1/client-portal/track/${testKodeAkses1} melacak progres secara publik`, async () => {
      // Panggilan TANPA header Authorization (publik)
      const res = await request(`/api/v1/client-portal/track/${testKodeAkses1}`);
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      const data = res.body.data;
      assert(data.kodeAkses === testKodeAkses1, 'Kode akses harus cocok');
      assert(data.submission.nomorSubmission === testNomorSub1, 'Nomor submission harus cocok');
      assert(data.overallStatus === 'pending', 'Status tracking harus pending');
      return `Pelacakan publik sukses: Klien '${data.klien}' [Progres: ${data.overallProgress}% - ${data.overallStatus}]`;
    });

    console.log('\n--- [4. Query, Filter, & Hak Akses Submission] ---');
    await executeTest('QUERY_SUBMISSION', 'GET /api/v1/submissions dengan pencarian nomor SSF', async () => {
      const res = await request(`/api/v1/submissions?search=${testNomorSub1}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.length >= 1, 'Harus menemukan minimal 1 permohonan');
      assert(res.body.data[0].nomorSubmission === testNomorSub1, 'Data harus sesuai');
      return `Ditemukan submission ${res.body.data[0].nomorSubmission} (Total Sampel: ${res.body.data[0].details.length})`;
    });

    await executeTest('DETAIL_SUBMISSION', `GET /api/v1/submissions/${testSubId1} memuat detail lengkap`, async () => {
      const res = await request(`/api/v1/submissions/${testSubId1}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      const data = res.body.data;
      assert(data.id === testSubId1, 'ID harus cocok');
      assert(data.details[0].beratGram === 500, `Berat harus 500, didapat ${data.details[0].beratGram}`);
      return `Detail submission terkonfirmasi: ${data.klien} | PO: ${data.poReferensi}`;
    });

    console.log('\n--- [5. Verifikasi Fisik & Konversi Menjadi Penerimaan Sampel] ---');
    await executeTest('VERIFY_STATUS', `Petugas lab memverifikasi sampel fisik tiba (status: 'diterima')`, async () => {
      const res = await request(`/api/v1/submissions/${testSubId1}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          status: 'diterima',
          catatan: 'Sampel fisik 2 kantong telah diterima di meja preparasi dalam kondisi tersegel baik',
        }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.status === 'diterima', 'Status harus diterima');
      return `Status verifikasi diperbarui: '${res.body.data.status}'`;
    });

    let convertedReceiptId = 0;
    let convertedReceiptNomor = '';

    await executeTest('CONVERT_RECEIPT', `Admin mengonversi SSF ${testNomorSub1} menjadi Batch Penerimaan Sampel (HTTP 201)`, async () => {
      const res = await request(`/api/v1/submissions/${testSubId1}/convert`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          catatan: 'Konversi resmi pendaftaran sampel laboratorium',
        }),
      });
      assert(res.status === 201, `HTTP status harus 201, didapat ${res.status}`);
      const data = res.body.data;
      assert(data.nomorPenerimaan.startsWith('REC-'), 'Nomor penerimaan harus diawali REC-');
      assert(data.totalSampelDikonversi === 2, 'Harus terkonversi 2 sampel');
      convertedReceiptId = data.receiptId;
      convertedReceiptNomor = data.nomorPenerimaan;
      createdReceiptIds.push(convertedReceiptId);
      return `Penerimaan Sampel ${convertedReceiptNomor} terbit dengan ${data.totalSampelDikonversi} nomor sampel unik`;
    });

    console.log('\n--- [6. Real-time Tracking Siklus Hidup Sampel (Client Portal)] ---');
    await executeTest('TRACK_LIFECYCLE', `Pelacakan publik kini merefleksikan Batch Penerimaan ${convertedReceiptNomor} dan tahapan sampel`, async () => {
      const res = await request(`/api/v1/client-portal/track/${testKodeAkses1}`);
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      const data = res.body.data;
      assert(data.receipt.nomorPenerimaan === convertedReceiptNomor, 'Nomor penerimaan harus terhubung');
      assert(data.samples.length === 2, 'Harus ada 2 sampel aktif dalam pelacakan');
      assert(data.samples[0].currentStage === 'PENERIMAAN', 'Tahap awal sampel harus PENERIMAAN');
      assert(data.samples[0].progressPct === 20, 'Progres awal penerimaan harus 20%');
      return `Live Tracking terhubung: Receipt ${data.receipt.nomorPenerimaan} | Progres rata-rata: ${data.overallProgress}%`;
    });

    await executeTest('CLIENT_ACCESS_KEYS', 'Admin dapat melihat daftar seluruh kunci akses portal (HTTP 200)', async () => {
      const res = await request('/api/v1/client-portal/access-keys', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.length >= 1, 'Harus ada minimal 1 kunci akses');
      return `Kunci akses terdaftar: ${res.body.data.length} item terdaftar`;
    });

    console.log('\n--- [7. Pembatalan & Jejak Audit Trail] ---');
    // Buat submission kedua untuk tes pembatalan
    const sub2Res = await request('/api/v1/submissions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${clientToken}` },
      body: JSON.stringify({
        klien: 'PT Batalkan Pengajuan',
        email: 'batal@sample.com',
        samples: [{ jenisMaterial: 'Batu Bara', beratGram: 100 }],
      }),
    });
    const sub2Id = sub2Res.body.data.id;
    const sub2Nomor = sub2Res.body.data.nomorSubmission;

    await executeTest('DELETE_PENDING', `Admin menghapus submission pending #${sub2Id} (HTTP 200)`, async () => {
      const res = await request(`/api/v1/submissions/${sub2Id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.deleted === true, 'Response deleted harus true');
      return `Submission ${sub2Nomor} berhasil dihapus`;
    });

    await executeTest('AUDIT_TRAIL', 'Pencatatan riwayat aktivitas ke tabel `log_aktivitas` untuk SUBMISSION', async () => {
      const logs = await prisma.activityLog.findMany({
        where: { modul: 'SUBMISSION' },
        orderBy: { id: 'desc' },
        take: 5,
      });
      assert(logs.length >= 3, `Harus ada minimal 3 log aktivitas submission, ditemukan ${logs.length}`);
      return `Audit trail terverifikasi: ${logs.length} entri riwayat SUBMISSION tercatat`;
    });

  } finally {
    server.close();
    // Pembersihan data uji
    if (createdAccessKeys.length > 0) {
      await prisma.clientAccess.deleteMany({
        where: { kodeAkses: { in: createdAccessKeys } },
      }).catch(() => {});
    }
    if (createdReceiptIds.length > 0) {
      await prisma.sample.deleteMany({
        where: { penerimaanId: { in: createdReceiptIds } },
      }).catch(() => {});
      await prisma.sampleReceipt.deleteMany({
        where: { id: { in: createdReceiptIds } },
      }).catch(() => {});
    }
    if (createdSubmissionIds.length > 0) {
      await prisma.sampleSubmissionDetail.deleteMany({
        where: { submissionId: { in: createdSubmissionIds } },
      }).catch(() => {});
      await prisma.sampleSubmission.deleteMany({
        where: { id: { in: createdSubmissionIds } },
      }).catch(() => {});
    }
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(`TOTAL PENGUJIAN CLIENT PORTAL & SUBMISSION: ${results.length}`);
  console.log(`PASS: ${passed} | FAIL: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runSubmissionTestSuite().catch((err) => {
  console.error('Fatal error saat menjalankan pengujian submission:', err);
  process.exit(1);
});
