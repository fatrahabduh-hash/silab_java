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

async function runEquipmentTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 8A: EQUIPMENT (PERALATAN) TESTS');
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

  const createdEquipmentIds: number[] = [];

  try {
    console.log('--- [1. Endpoint Statistik Peralatan Lab] ---');
    await executeTest('STATS', 'GET /api/v1/equipment/stats mengembalikan metrik peralatan', async () => {
      const res = await request('/api/v1/equipment/stats', {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.status === 'success', 'Response status harus success');
      const data = res.body.data;
      assert(typeof data.total === 'number', 'Field total harus berupa number');
      assert(typeof data.tersedia === 'number', 'Field tersedia harus berupa number');
      return `Total alat: ${data.total} (Tersedia: ${data.tersedia}, Maintenance: ${data.maintenance}, Rusak: ${data.rusak})`;
    });

    console.log('\n--- [2. Registrasi Peralatan Baru & RBAC] ---');
    let testEquipId1 = 0;
    const testKodeAlat1 = `EQ-TEST-${Date.now().toString().slice(-4)}`;

    await executeTest('CREATE', 'Analis mendaftarkan peralatan laboratorium baru (HTTP 201)', async () => {
      const today = new Date();
      const nextYear = new Date(today);
      nextYear.setFullYear(nextYear.getFullYear() + 1);

      const res = await request('/api/v1/equipment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          kodeAlat: testKodeAlat1,
          nama: 'Spectrophotometer UV-Vis 2600',
          lokasi: 'Laboratorium Kimia Basah Lantai 2',
          status: 'tersedia',
          tanggalKalibrasi: today.toISOString().split('T')[0],
          masaBerlakuKalibrasi: nextYear.toISOString().split('T')[0],
          jamPakai: 120,
          pic: 'Rani Dwi',
          catatan: 'Instrumen analitis kuantitatif larutan standar',
        }),
      });

      assert(res.status === 201, `HTTP status harus 201, didapat ${res.status}`);
      assert(res.body.status === 'success', 'Status body harus success');
      assert(res.body.data.kodeAlat === testKodeAlat1, 'Kode alat harus sesuai');
      assert(res.body.data.kalibrasiStatus === 'valid', 'Status kalibrasi harus valid');
      testEquipId1 = res.body.data.id;
      createdEquipmentIds.push(testEquipId1);
      return `Peralatan ID #${testEquipId1} berhasil didaftarkan [Status Kalibrasi: ${res.body.data.kalibrasiStatus}]`;
    });

    await executeTest('VALIDATION', 'Registrasi kode alat duplikat ditolak HTTP 409 CONFLICT', async () => {
      const res = await request('/api/v1/equipment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          kodeAlat: testKodeAlat1,
          nama: 'Duplicate Device',
        }),
      });
      assert(res.status === 409, `HTTP status harus 409, didapat ${res.status}`);
      return `Ditolak tepat dengan kode: ${res.body.code}`;
    });

    await executeTest('RBAC', 'Klien dilarang mendaftarkan peralatan lab (HTTP 403)', async () => {
      const res = await request('/api/v1/equipment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${clientToken}` },
        body: JSON.stringify({
          kodeAlat: 'EQ-CLIENT-FAIL',
          nama: 'Client Device',
        }),
      });
      assert(res.status === 403, `HTTP status harus 403, didapat ${res.status}`);
      return 'Akses klien ditolak dengan benar';
    });

    console.log('\n--- [3. Query, Pencarian, & Filter Peralatan] ---');
    await executeTest('QUERY', 'GET /api/v1/equipment dengan pencarian kode alat', async () => {
      const res = await request(`/api/v1/equipment?search=${testKodeAlat1}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.length >= 1, 'Harus menemukan minimal 1 alat sesuai pencarian');
      assert(res.body.data[0].kodeAlat === testKodeAlat1, 'Data yang ditemukan harus sesuai');
      return `Ditemukan ${res.body.data.length} instrumen sesuai query`;
    });

    await executeTest('DETAIL', `GET /api/v1/equipment/${testEquipId1} memuat detail dan perhitungan kalibrasi`, async () => {
      const res = await request(`/api/v1/equipment/${testEquipId1}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      const data = res.body.data;
      assert(data.id === testEquipId1, 'ID harus cocok');
      assert(typeof data.sisaHariKalibrasi === 'number', 'Sisa hari kalibrasi harus terhitung');
      return `Detail alat: ${data.nama} | Sisa kalibrasi: ${data.sisaHariKalibrasi} hari`;
    });

    console.log('\n--- [4. Pembaruan Spesifikasi, Status, & Jam Pakai] ---');
    await executeTest('UPDATE', `PUT /api/v1/equipment/${testEquipId1} memperbarui PIC dan lokasi`, async () => {
      const res = await request(`/api/v1/equipment/${testEquipId1}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          lokasi: 'Laboratorium Instrumentasi Ruang A3',
          pic: 'Budi Santoso',
        }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.pic === 'Budi Santoso', 'PIC harus terupdate');
      return `Lokasi baru: ${res.body.data.lokasi}, PIC: ${res.body.data.pic}`;
    });

    await executeTest('STATUS', `PATCH /api/v1/equipment/${testEquipId1}/status ubah ke 'maintenance'`, async () => {
      const res = await request(`/api/v1/equipment/${testEquipId1}/status`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({ status: 'maintenance' }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.status === 'maintenance', 'Status harus menjadi maintenance');
      return `Status kondisi alat kini: '${res.body.data.status}'`;
    });

    await executeTest('USAGE', `POST /api/v1/equipment/${testEquipId1}/log-usage menambah jam pakai kumulatif`, async () => {
      const res = await request(`/api/v1/equipment/${testEquipId1}/log-usage`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({
          tambahanJam: 25,
          catatan: 'Pengujian batch sampel nikel PT Vale Indonesia',
        }),
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.jamPakai === 145, `Jam pakai harus 145 (120 + 25), didapat ${res.body.data.jamPakai}`);
      return `Total jam operasional alat sekarang: ${res.body.data.jamPakai} jam`;
    });

    console.log('\n--- [5. Otorisasi Penghapusan & Audit Trail] ---');
    await executeTest('DELETE_RBAC', 'Analis dilarang menghapus peralatan laboratorium (HTTP 403)', async () => {
      const res = await request(`/api/v1/equipment/${testEquipId1}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${analisToken}` },
      });
      assert(res.status === 403, `HTTP status harus 403, didapat ${res.status}`);
      return 'Akses analis untuk hapus ditolak dengan tepat';
    });

    await executeTest('DELETE', 'Supervisor berhasil menghapus peralatan uji (HTTP 200)', async () => {
      const res = await request(`/api/v1/equipment/${testEquipId1}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });
      assert(res.status === 200, `HTTP status harus 200, didapat ${res.status}`);
      assert(res.body.data.deleted === true, 'Response harus menandakan terhapus');
      return `Peralatan ${testKodeAlat1} berhasil dihapus oleh Supervisor`;
    });

    await executeTest('AUDIT', 'Pencatatan riwayat aktivitas ke tabel `log_aktivitas`', async () => {
      const logs = await prisma.activityLog.findMany({
        where: { modul: 'EQUIPMENT' },
        orderBy: { id: 'desc' },
        take: 5,
      });
      assert(logs.length >= 3, `Harus ada minimal 3 log peralatan, ditemukan ${logs.length}`);
      return `Audit trail terverifikasi: ${logs.length} entri riwayat peralatan tercatat`;
    });

  } finally {
    server.close();
    // Bersihkan data uji jika masih tertinggal
    if (createdEquipmentIds.length > 0) {
      await prisma.equipment.deleteMany({
        where: { id: { in: createdEquipmentIds } },
      }).catch(() => {});
    }
  }

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(`TOTAL PENGUJIAN PERALATAN: ${results.length}`);
  console.log(`PASS: ${passed} | FAIL: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runEquipmentTestSuite().catch((err) => {
  console.error('Fatal error saat menjalankan pengujian peralatan:', err);
  process.exit(1);
});
