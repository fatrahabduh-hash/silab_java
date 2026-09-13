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

async function runReagentTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 8B: CHEMICAL REAGENTS (BAHAN KIMIA) TESTS');
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

  const createdReagentIds: number[] = [];

  try {
    console.log('--- [1. Endpoint Statistik Inventaris Bahan Kimia] ---');
    await executeTest('STATS', 'GET /api/v1/reagents/stats mengembalikan statistik inventaris bahan', async () => {
      const res = await request('/api/v1/reagents/stats', {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.status === 'success', 'Response status harus success');
      const data = res.body.data;
      assert(typeof data.totalItem === 'number', 'Field totalItem harus number');
      assert(typeof data.stokKritis === 'number', 'Field stokKritis harus number');
      return `Total item: ${data.totalItem} (Stok Kritis: ${data.stokKritis}, Kadaluarsa: ${data.kadaluarsa})`;
    });

    console.log('\n--- [2. Registrasi Reagen Kimia Baru & Validasi] ---');
    let testReagentId1 = 0;
    const testKodeBahan1 = `RG-TEST-${Date.now().toString().slice(-4)}`;

    await executeTest('CREATE', 'Analis mendaftarkan reagen kimia baru (HTTP 201)', async () => {
      const today = new Date();
      const in2Years = new Date(today);
      in2Years.setFullYear(in2Years.getFullYear() + 2);

      const res = await request('/api/v1/reagents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          kodeBahan: testKodeBahan1,
          nama: 'Asam Nitrat (HNO3) 65% PA Merck',
          stok: 2500,
          satuan: 'ml',
          stokMinimum: 500,
          supplier: 'PT Merck Indonesia Chemicals',
          tanggalKadaluarsa: in2Years.toISOString().split('T')[0],
        }),
      });

      assert(res.status === 201, `HTTP status harus 201, didapat ${res.status}`);
      assert(res.body.status === 'success', 'Response status harus success');
      assert(res.body.data.kodeBahan === testKodeBahan1, 'Kode bahan harus sesuai');
      assert(res.body.data.isStokKritis === false, 'Stok awal tidak boleh kritis');
      testReagentId1 = res.body.data.id;
      createdReagentIds.push(testReagentId1);
      return `Reagen ID #${testReagentId1} didaftarkan (Stok: ${res.body.data.stok} ${res.body.data.satuan})`;
    });

    await executeTest('VALIDATION', 'Registrasi kode bahan duplikat ditolak HTTP 409 CONFLICT', async () => {
      const res = await request('/api/v1/reagents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          kodeBahan: testKodeBahan1,
          nama: 'Duplikat HNO3',
        }),
      });
      assert(res.status === 409, `HTTP status harus 409, didapat ${res.status}`);
      return `Ditolak tepat dengan kode: ${res.body.code}`;
    });

    await executeTest('RBAC', 'Klien dilarang mendaftarkan bahan kimia lab (HTTP 403)', async () => {
      const res = await request('/api/v1/reagents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          kodeBahan: 'RG-CLIENT-FAIL',
          nama: 'Client Chemical',
        }),
      });
      assert(res.status === 403, `HTTP status harus 403, didapat ${res.status}`);
      return 'Akses klien ditolak dengan benar';
    });

    console.log('\n--- [3. Query, Pencarian, & Filter Bahan Kimia] ---');
    await executeTest('QUERY', 'GET /api/v1/reagents dengan pencarian kode bahan', async () => {
      const res = await request(`/api/v1/reagents?search=${testKodeBahan1}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.length >= 1, 'Harus menemukan minimal 1 reagen sesuai pencarian');
      assert(res.body.data[0].kodeBahan === testKodeBahan1, 'Kode bahan harus cocok');
      return `Ditemukan ${res.body.data.length} item sesuai query`;
    });

    await executeTest('DETAIL', `GET /api/v1/reagents/${testReagentId1} memuat detail & indikator mutu`, async () => {
      const res = await request(`/api/v1/reagents/${testReagentId1}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      const data = res.body.data;
      assert(data.id === testReagentId1, 'ID reagen harus sesuai');
      assert(typeof data.sisaHariKadaluarsa === 'number', 'Sisa hari kadaluarsa harus dihitung');
      return `Detail reagen: ${data.nama} | Sisa masa berlaku: ${data.sisaHariKadaluarsa} hari`;
    });

    console.log('\n--- [4. Mutasi Stok Bahan Kimia (Masuk, Keluar, Opname)] ---');
    await executeTest('STOCK_IN', `POST /api/v1/reagents/${testReagentId1}/stock-adjust [masuk +1000 ml]`, async () => {
      const res = await request(`/api/v1/reagents/${testReagentId1}/stock-adjust`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          jenis: 'masuk',
          jumlah: 1000,
          keterangan: 'Penerimaan batch PO Merck #9921',
        }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.stokSekarang === 3500, `Stok harus 3500 (2500 + 1000), didapat ${res.body.data.stokSekarang}`);
      return `Stok berhasil bertambah: 2500 -> ${res.body.data.stokSekarang} ml`;
    });

    await executeTest('STOCK_EXCEED', 'Pengurangan stok melebihi stok yang tersedia ditolak HTTP 400', async () => {
      const res = await request(`/api/v1/reagents/${testReagentId1}/stock-adjust`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          jenis: 'keluar',
          jumlah: 10000, // Melebihi stok 3500
          keterangan: 'Pengambilan berlebih tidak wajar',
        }),
      });
      assert(res.status === 400, `HTTP status harus 400, didapat ${res.status}`);
      assert(res.body.code === 'INSUFFICIENT_STOCK', `Kode harus INSUFFICIENT_STOCK, didapat ${res.body.code}`);
      return `Proteksi stok minus aktif: ${res.body.message}`;
    });

    await executeTest('STOCK_OUT', `POST /api/v1/reagents/${testReagentId1}/stock-adjust [keluar -500 ml]`, async () => {
      const res = await request(`/api/v1/reagents/${testReagentId1}/stock-adjust`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          jenis: 'keluar',
          jumlah: 500,
          keterangan: 'Digunakan untuk preparasi destruksi bijih nikel',
        }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.stokSekarang === 3000, `Stok harus 3000 (3500 - 500), didapat ${res.body.data.stokSekarang}`);
      return `Stok berhasil berkurang: 3500 -> ${res.body.data.stokSekarang} ml`;
    });

    await executeTest('STOCK_OPNAME', `POST /api/v1/reagents/${testReagentId1}/stock-adjust [opname -> 400 ml (Kritis)]`, async () => {
      const res = await request(`/api/v1/reagents/${testReagentId1}/stock-adjust`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          jenis: 'opname',
          jumlah: 400, // Di bawah batas minimum 500
          keterangan: 'Hasil inventarisasi fisik bulanan ruang asam',
        }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.stokSekarang === 400, `Stok opname harus 400, didapat ${res.body.data.stokSekarang}`);
      assert(res.body.data.isStokKritis === true, 'Flag isStokKritis harus bernilai TRUE karena stok (400) <= min (500)');
      return `Stok opname berhasil ditetapkan: 400 ml [Status Kritis: ${res.body.data.isStokKritis}]`;
    });

    console.log('\n--- [5. Otorisasi Penghapusan & Jejak Audit] ---');
    await executeTest('DELETE_RBAC', 'Analis dilarang menghapus bahan kimia (HTTP 403)', async () => {
      const res = await request(`/api/v1/reagents/${testReagentId1}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 403, `HTTP status harus 403, didapat ${res.status}`);
      return 'Akses penghapusan ditolak untuk analis';
    });

    await executeTest('DELETE', 'Supervisor berhasil menghapus bahan kimia (HTTP 200)', async () => {
      const res = await request(`/api/v1/reagents/${testReagentId1}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.deleted === true, 'Response harus menandakan deleted: true');
      return `Bahan kimia ${testKodeBahan1} berhasil dihapus oleh Supervisor`;
    });

    await executeTest('AUDIT', 'Pencatatan riwayat aktivitas ke tabel `log_aktivitas`', async () => {
      const logs = await prisma.activityLog.findMany({
        where: { modul: 'REAGENT' },
        orderBy: { id: 'desc' },
        take: 5,
      });
      assert(logs.length >= 3, `Harus ada minimal 3 log aktivitas bahan, ditemukan ${logs.length}`);
      return `Audit trail terkonfirmasi: ${logs.length} entri riwayat bahan tercatat`;
    });

  } finally {
    server.close();
    // Bersihkan data uji jika masih ada yang tertinggal
    if (createdReagentIds.length > 0) {
      await prisma.chemicalReagent.deleteMany({
        where: { id: { in: createdReagentIds } },
      }).catch(() => {});
    }
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(`TOTAL PENGUJIAN BAHAN KIMIA (REAGENTS): ${results.length}`);
  console.log(`PASS: ${passed} | FAIL: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runReagentTestSuite().catch((err) => {
  console.error('Fatal error saat menjalankan pengujian reagen:', err);
  process.exit(1);
});
