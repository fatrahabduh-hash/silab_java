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

async function runInvoiceTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 9: BILLING, INVOICING & TARIFF TESTS');
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

  const createdTariffIds: number[] = [];
  const createdInvoiceIds: number[] = [];
  let testReceiptId = 0;
  let testSampleId = 0;

  try {
    // -------------------------------------------------------------
    // DATA SEEDING AWAL
    // -------------------------------------------------------------
    const seedReceipt = await prisma.sampleReceipt.create({
      data: {
        nomorPenerimaan: `REC-INV-${Date.now().toString().slice(-4)}`,
        klien: 'PT Freeport Indonesia',
        tanggalTerima: new Date(),
        jumlahSampel: 5,
        jenisMaterial: 'Konsentrat Tembaga & Emas',
        metodeUji: 'XRF & AAS Quantitative',
        status: 'diproses',
      },
    });
    testReceiptId = seedReceipt.id;

    const seedSample = await prisma.sample.create({
      data: {
        penerimaanId: testReceiptId,
        kodeSampel: `SMP-INV-${Date.now().toString().slice(-4)}`,
        tanggalMasuk: new Date(),
        jenisMaterial: 'Konsentrat Tembaga',
        beratGram: 250.0,
        klien: 'PT Freeport Indonesia',
        status: 'selesai',
      },
    });
    testSampleId = seedSample.id;

    console.log('--- [1. Manajemen Katalog Tarif Pengujian] ---');
    let testTariffId = 0;
    await executeTest('TARIFF_CREATE', 'Admin mendaftarkan tarif pengujian baru (HTTP 201)', async () => {
      const res = await request('/api/v1/tariffs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          nama: 'Analisis Kadar Tembaga (Cu) XRF Spektrometri',
          metode: 'XRF ASTM E1621',
          parameter: 'Cu (Copper)',
          harga: 350000,
          satuan: 'per sampel',
          aktif: true,
        }),
      });
      assert(res.status === 201, `HTTP status harus 201, didapat ${res.status}`);
      assert(res.body.status === 'success', 'Status body harus success');
      assert(res.body.data.harga === 350000, `Harga harus 350000, didapat ${res.body.data.harga}`);
      testTariffId = res.body.data.id;
      createdTariffIds.push(testTariffId);
      return `Tarif ID #${testTariffId} didaftarkan: ${res.body.data.nama} (Rp ${res.body.data.harga.toLocaleString('id-ID')})`;
    });

    await executeTest('TARIFF_RBAC', 'Klien dilarang menambah tarif pengujian (HTTP 403)', async () => {
      const res = await request('/api/v1/tariffs', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          nama: 'Tarif Ilegal',
          harga: 10000,
        }),
      });
      assert(res.status === 403, `HTTP status harus 403, didapat ${res.status}`);
      return 'Otorisasi peran tepat: Klien dilarang mengelola tarif';
    });

    await executeTest('TARIFF_UPDATE', `Supervisor memperbarui harga tarif #${testTariffId} (HTTP 200)`, async () => {
      const res = await request(`/api/v1/tariffs/${testTariffId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({
          harga: 375000,
        }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.harga === 375000, 'Harga harus terupdate menjadi 375000');
      return `Harga baru tarif: Rp ${res.body.data.harga.toLocaleString('id-ID')}`;
    });

    await executeTest('TARIFF_LIST', 'GET /api/v1/tariffs menampilkan daftar tarif aktif', async () => {
      const res = await request('/api/v1/tariffs?aktif=true', {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.length >= 1, 'Harus ada minimal 1 tarif');
      return `Total tarif aktif terdaftar: ${res.body.data.length} item`;
    });

    console.log('\n--- [2. Statistik Keuangan & Invoicing] ---');
    await executeTest('INVOICE_STATS', 'GET /api/v1/invoices/stats ringkasan piutang & omset', async () => {
      const res = await request('/api/v1/invoices/stats', {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      const data = res.body.data;
      assert(typeof data.totalInvoice === 'number', 'totalInvoice harus number');
      assert(typeof data.totalNominal === 'number', 'totalNominal harus number');
      return `Total Invoices: ${data.totalInvoice} | Total Nominal: Rp ${data.totalNominal.toLocaleString('id-ID')}`;
    });

    console.log('\n--- [3. Penerbitan Invoice & Kalkulasi Keuangan] ---');
    let testInvoiceId = 0;
    let testNomorInvoice = '';

    await executeTest('INVOICE_CREATE', 'Admin menerbitkan invoice dengan kalkulasi Diskon & PPN (HTTP 201)', async () => {
      // Perhitungan:
      // Item 1: 5 * 375.000 = 1.875.000
      // Item 2: 2 * 250.000 = 500.000
      // Subtotal = 2.375.000
      // Diskon 10% = 237.500
      // DPP = 2.137.500
      // PPN 11% = 235.125
      // Total = 2.372.625
      const res = await request('/api/v1/invoices', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          penerimaanId: testReceiptId,
          klien: 'PT Freeport Indonesia',
          alamatKlien: 'Gedung Plaza 89 Lt. 5, Jl. H.R. Rasuna Said, Jakarta Selatan',
          tanggalInvoice: new Date().toISOString().split('T')[0],
          diskonPct: 10,
          ppnPct: 11,
          status: 'draft',
          catatan: 'Tagihan pengujian laboratorium batch konsentrat tembaga',
          items: [
            {
              deskripsi: 'Analisis Kadar Cu XRF Spektrometri',
              sampelId: testSampleId,
              tarifId: testTariffId,
              qty: 5,
              hargaSatuan: 375000,
            },
            {
              deskripsi: 'Preparasi Sampel Pulverizing 200 Mesh',
              qty: 2,
              hargaSatuan: 250000,
            },
          ],
        }),
      });

      assert(res.status === 201, `HTTP status harus 201, didapat ${res.status}`);
      const data = res.body.data;
      assert(data.subtotal === 2375000, `Subtotal harus 2375000, didapat ${data.subtotal}`);
      assert(data.diskonNominal === 237500, `Diskon nominal harus 237500, didapat ${data.diskonNominal}`);
      assert(data.ppnNominal === 235125, `PPN nominal harus 235125, didapat ${data.ppnNominal}`);
      assert(data.total === 2372625, `Total harus 2372625, didapat ${data.total}`);
      assert(data.nomorInvoice.startsWith('INV-'), 'Nomor invoice harus diawali INV-');
      assert(data.items.length === 2, 'Jumlah item harus 2');

      testInvoiceId = data.id;
      testNomorInvoice = data.nomorInvoice;
      createdInvoiceIds.push(testInvoiceId);
      return `Invoice ${testNomorInvoice} terbit: Subtotal Rp ${data.subtotal.toLocaleString('id-ID')} -> Total Akhir Rp ${data.total.toLocaleString('id-ID')}`;
    });

    console.log('\n--- [4. Query, Filter, & Hak Akses Multi-Tenant] ---');
    await executeTest('INVOICE_QUERY', 'GET /api/v1/invoices menampilkan invoice berdasarkan pencarian nomor', async () => {
      const res = await request(`/api/v1/invoices?search=${testNomorInvoice}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.length >= 1, 'Harus menemukan minimal 1 invoice');
      assert(res.body.data[0].nomorInvoice === testNomorInvoice, 'Nomor invoice harus sesuai');
      return `Ditemukan invoice ${res.body.data[0].nomorInvoice} (Status: ${res.body.data[0].status})`;
    });

    await executeTest('INVOICE_DETAIL', `GET /api/v1/invoices/${testInvoiceId} memuat detail lengkap item & receipt`, async () => {
      const res = await request(`/api/v1/invoices/${testInvoiceId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      const data = res.body.data;
      assert(data.id === testInvoiceId, 'ID harus sama');
      assert(data.receipt.id === testReceiptId, 'Relasi penerimaan sampel harus terhubung');
      return `Detail invoice terverifikasi: ${data.items.length} rincian item tagihan terpasang`;
    });

    console.log('\n--- [5. Siklus Transisi Status Pembayaran (Lifecycle)] ---');
    await executeTest('STATUS_PUBLISH', `PATCH /api/v1/invoices/${testInvoiceId}/status ubah status ke 'diterbitkan'`, async () => {
      const res = await request(`/api/v1/invoices/${testInvoiceId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({ status: 'diterbitkan' }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.status === 'diterbitkan', 'Status harus menjadi diterbitkan');
      return `Status invoice kini: '${res.body.data.status}'`;
    });

    await executeTest('STATUS_PAID', `PATCH /api/v1/invoices/${testInvoiceId}/status ubah status ke 'lunas'`, async () => {
      const res = await request(`/api/v1/invoices/${testInvoiceId}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ status: 'lunas', catatan: 'Pembayaran transfer BCA terkonfirmasi via rekening koran' }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.status === 'lunas', 'Status harus menjadi lunas');
      return `Invoice ${testNomorInvoice} dinyatakan LUNAS`;
    });

    await executeTest('PAID_PROTECTION', 'Penghapusan invoice yang telah LUNAS ditolak HTTP 400', async () => {
      const res = await request(`/api/v1/invoices/${testInvoiceId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 400, `HTTP status harus 400, didapat ${res.status}`);
      assert(res.body.code === 'CANNOT_DELETE_PAID_INVOICE', `Kode error harus CANNOT_DELETE_PAID_INVOICE`);
      return `Integritas audit terlindungi: ${res.body.message}`;
    });

    console.log('\n--- [6. Penghapusan Draft & Jejak Audit Trail] ---');
    // Buat invoice draft kedua untuk pengujian hapus draft
    const draftRes = await request('/api/v1/invoices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        klien: 'PT Sample Draft',
        status: 'draft',
        items: [{ deskripsi: 'Item Draft Uji', qty: 1, hargaSatuan: 100000 }],
      }),
    });
    const draftId = draftRes.body.data.id;
    const draftNomor = draftRes.body.data.nomorInvoice;

    await executeTest('DELETE_DRAFT', `Admin menghapus invoice draft #${draftId} (HTTP 200)`, async () => {
      const res = await request(`/api/v1/invoices/${draftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.deleted === true, 'Response deleted harus true');
      return `Invoice draft ${draftNomor} berhasil dihapus`;
    });

    await executeTest('AUDIT_TRAIL', 'Pencatatan riwayat aktivitas ke tabel `log_aktivitas` untuk TARIFF & INVOICE', async () => {
      const [tariffLogs, invoiceLogs] = await Promise.all([
        prisma.activityLog.findMany({ where: { modul: 'TARIFF' } }),
        prisma.activityLog.findMany({ where: { modul: 'INVOICE' } }),
      ]);
      assert(tariffLogs.length >= 2, `Log TARIFF harus ada minimal 2, ditemukan ${tariffLogs.length}`);
      assert(invoiceLogs.length >= 3, `Log INVOICE harus ada minimal 3, ditemukan ${invoiceLogs.length}`);
      return `Audit trail terverifikasi: ${tariffLogs.length} entri TARIFF & ${invoiceLogs.length} entri INVOICE`;
    });

  } finally {
    server.close();
    // Bersihkan data uji invoice dan relasi secara aman
    if (createdInvoiceIds.length > 0) {
      await prisma.invoiceItem.deleteMany({
        where: { invoiceId: { in: createdInvoiceIds } },
      }).catch(() => {});
      await prisma.invoice.deleteMany({
        where: { id: { in: createdInvoiceIds } },
      }).catch(() => {});
    }
    if (createdTariffIds.length > 0) {
      await prisma.testTariff.deleteMany({
        where: { id: { in: createdTariffIds } },
      }).catch(() => {});
    }
    if (testSampleId) {
      await prisma.sample.delete({ where: { id: testSampleId } }).catch(() => {});
    }
    if (testReceiptId) {
      await prisma.sampleReceipt.delete({ where: { id: testReceiptId } }).catch(() => {});
    }
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(`TOTAL PENGUJIAN INVOICE & TARIFF: ${results.length}`);
  console.log(`PASS: ${passed} | FAIL: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runInvoiceTestSuite().catch((err) => {
  console.error('Fatal error saat menjalankan pengujian invoice:', err);
  process.exit(1);
});
