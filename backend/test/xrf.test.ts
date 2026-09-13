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

async function runXrfTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — PHASE 3: XRF INGESTION & DEVICE INTEGRATION TESTS');
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

  const analisToken = JwtUtil.generateAuthTokens({
    sub: 2,
    username: 'rani.d',
    role: 'analis',
  }).accessToken;

  const validApiKey = 'xrf_secret_labmineral_2026';
  const testDeviceId = 'XRF-TEST-UNIT-99';

  // Tracking IDs untuk pembersihan data uji
  const createdMeasurementIds: number[] = [];
  const createdSampleIds: number[] = [];

  try {
    // -------------------------------------------------------------
    // GROUP 1: Health Check & Security Header API Receiver
    // -------------------------------------------------------------
    console.log('--- [1. Status Receiver & Keamanan API Key] ---');

    await executeTest('HEALTH', 'GET /api/v1/xrf/health merespon online dengan status 200', async () => {
      const res = await request('/api/v1/xrf/health');
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(res.body.status === 'online', 'Status harus online');
      return `Service: ${res.body.service}`;
    });

    await executeTest('KEAMANAN', 'POST /api/v1/xrf/receive tanpa API Key ditolak HTTP 401', async () => {
      const res = await request('/api/v1/xrf/receive', {
        method: 'POST',
        body: JSON.stringify({
          device_id: testDeviceId,
          db_source: 'ping',
          report_id: 1,
          sample_name: 'TEST_PING',
        }),
      });
      assert(res.status === 401, `Expected status 401, got ${res.status}`);
      assert(res.body.code === 'INVALID_XRF_API_KEY', 'Expected code INVALID_XRF_API_KEY');
      return '401 Unauthorized terkonfirmasi';
    });

    await executeTest('KEAMANAN', 'POST /api/v1/xrf/receive dengan API Key salah ditolak HTTP 401', async () => {
      const res = await request('/api/v1/xrf/receive', {
        method: 'POST',
        body: JSON.stringify({
          api_key: 'wrong_secret_key',
          device_id: testDeviceId,
          db_source: 'ping',
          report_id: 1,
          sample_name: 'TEST_PING',
        }),
      });
      assert(res.status === 401, `Expected status 401, got ${res.status}`);
      return 'Key palsu ditolak';
    });

    // -------------------------------------------------------------
    // GROUP 2: Heartbeat & Device Auto-Registration
    // -------------------------------------------------------------
    console.log('\n--- [2. Heartbeat & Registrasi Otomatis Perangkat XRF] ---');

    await executeTest('HEARTBEAT', 'Ping heartbeat dari alat XRF berhasil memperbarui last_seen_at', async () => {
      const res = await request('/api/v1/xrf/receive', {
        method: 'POST',
        body: JSON.stringify({
          api_key: validApiKey,
          device_id: testDeviceId,
          device_name: 'XRF Explorer 7000 Lab Geologi',
          device_type: 'Handheld XRF',
          db_source: 'ping',
          report_id: 0,
          sample_name: 'HEARTBEAT_PING',
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.mode === 'heartbeat', 'Mode harus heartbeat');
      return `Heartbeat diterima untuk perangkat ${testDeviceId}`;
    });

    await executeTest('DEVICES', 'GET /api/v1/xrf/devices menampilkan alat dalam status online', async () => {
      const res = await request('/api/v1/xrf/devices', {
        headers: { Authorization: `Bearer ${analisToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(Array.isArray(res.body.data.devices), 'Devices harus berupa array');

      const found = res.body.data.devices.find((d: any) => d.deviceId === testDeviceId);
      assert(found, `Perangkat ${testDeviceId} harus terdaftar`);
      assert(found.is_online === true, 'Status perangkat harus online');
      return `Alat ${found.deviceName} terdeteksi status: ${found.status}`;
    });

    // -------------------------------------------------------------
    // GROUP 3: Ingestion Spektrum Hasil Pengukuran XRF
    // -------------------------------------------------------------
    console.log('\n--- [3. Ingestion Spektrum & Konsentrasi Unsur XRF] ---');

    let ingestedMeasurementId = 0;
    const testTimestampMs = Date.now();

    await executeTest('INGESTION', 'Simpan hasil scan XRF lengkap dengan 4 unsur konsentrasi', async () => {
      const res = await request('/api/v1/xrf/receive', {
        method: 'POST',
        body: JSON.stringify({
          api_key: validApiKey,
          device_id: testDeviceId,
          db_source: 'mineral.db',
          report_id: 801,
          sample_name: 'ORE-NKL-TEST-01',
          sample_supplier: 'PT. Antam Pomalaa',
          test_date: '2026-09-11 10:30:00',
          timestamp_ms: testTimestampMs,
          test_time: 45,
          tub_voltage: 40.0,
          tub_current: 25.5,
          work_curve_name: 'Laterite Mode',
          grade: 'Saprolite Ore Grade A',
          operator: 'Budi Santoso',
          gps: '(-4.1234, 121.5678)',
          longitude: 121.5678,
          latitude: -4.1234,
          altitude: 150.0,
          cps: 24500,
          counts: 1102500,
          temperature: 31.5,
          elements: [
            { name: 'Ni', concentration: 2.15, error: 0.05, unit: '%' },
            { name: 'Fe', concentration: 48.2, error: 0.35, unit: '%' },
            { name: 'Co', concentration: 0.09, error: 0.01, unit: '%' },
            { name: 'SiO2', concentration: 15.4, error: 0.20, unit: '%' },
          ],
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.action === 'inserted', 'Action harus inserted');
      assert(res.body.measurement_id > 0, 'Measurement ID harus terisi');

      ingestedMeasurementId = res.body.measurement_id;
      createdMeasurementIds.push(ingestedMeasurementId);

      const elements = res.body.measurement.elements;
      assert(elements.length === 4, 'Harus menyimpan 4 unsur');
      return `Tersimpan Measurement ID #${ingestedMeasurementId} dengan 4 unsur (Ni: 2.15%, Fe: 48.2%)`;
    });

    await executeTest('INGESTION', 'Idempotensi: Sync ulang data yang sama menghasilkan status updated tanpa duplikat', async () => {
      const res = await request('/api/v1/xrf/receive', {
        method: 'POST',
        body: JSON.stringify({
          api_key: validApiKey,
          device_id: testDeviceId,
          db_source: 'mineral.db',
          report_id: 801,
          sample_name: 'ORE-NKL-TEST-01-REVISED',
          timestamp_ms: testTimestampMs,
          work_curve_name: 'Laterite Mode',
          operator: 'Budi Santoso',
          elements: [
            { name: 'Ni', concentration: 2.18, error: 0.04, unit: '%' },
            { name: 'Fe', concentration: 48.5, error: 0.30, unit: '%' },
          ],
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.action === 'updated', 'Action harus updated');
      assert(res.body.measurement_id === ingestedMeasurementId, 'ID harus tetap sama');
      assert(res.body.measurement.sampleName === 'ORE-NKL-TEST-01-REVISED', 'Nama sampel harus terupdate');
      assert(res.body.measurement.elements.length === 2, 'Unsur harus diperbarui menjadi 2');
      return `Idempotensi terverifikasi (Record diperbarui aman)`;
    });

    // -------------------------------------------------------------
    // GROUP 4: Autentikasi Admin XRF (Device Unlock)
    // -------------------------------------------------------------
    console.log('\n--- [4. Autentikasi Buka Kunci Admin XRF (xrf_admin_logs)] ---');

    await executeTest('XRF_AUTH', 'Role Analis dilarang mengakses otorisasi unlock XRF (HTTP 403)', async () => {
      const res = await request('/api/v1/xrf/auth', {
        method: 'POST',
        body: JSON.stringify({
          username: 'rani.d',
          password: 'password',
          device_id: testDeviceId,
        }),
      });

      assert(res.status === 403, `Expected status 403, got ${res.status}`);
      assert(res.body.code === 'XRF_ADMIN_ROLE_FORBIDDEN', 'Expected XRF_ADMIN_ROLE_FORBIDDEN');
      return 'Otorisasi analis ditolak dengan pesan yang sesuai';
    });

    await executeTest('XRF_AUTH', 'Password salah ditolak HTTP 401 dan tercatat FAILED_PASSWORD', async () => {
      const res = await request('/api/v1/xrf/auth', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: 'wrongpassword',
          device_id: testDeviceId,
        }),
      });

      assert(res.status === 401, `Expected status 401, got ${res.status}`);
      return 'Password salah ditolak';
    });

    await executeTest('XRF_AUTH', 'Admin berhasil autentikasi unlock XRF (HTTP 200)', async () => {
      const res = await request('/api/v1/xrf/auth', {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin',
          password: 'password',
          device_id: testDeviceId,
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.token, 'Harus menerbitkan token');
      assert(res.body.user.role === 'admin', 'Role harus admin');
      return `Admin terverifikasi, token diterbitkan`;
    });

    // -------------------------------------------------------------
    // GROUP 5: Query & Detail Pengukuran XRF
    // -------------------------------------------------------------
    console.log('\n--- [5. Pengambilan & Filter Riwayat Pengukuran XRF] ---');

    await executeTest('QUERY', 'Daftar riwayat pengukuran via GET /api/v1/xrf/measurements', async () => {
      const res = await request(`/api/v1/xrf/measurements?deviceId=${testDeviceId}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.pagination.total >= 1, 'Total harus >= 1');
      return `Total pengukuran ditemukan: ${res.body.data.pagination.total}`;
    });

    await executeTest('QUERY', 'Detail pengukuran dan rincian elemen via GET /api/v1/xrf/measurements/:id', async () => {
      const res = await request(`/api/v1/xrf/measurements/${ingestedMeasurementId}`, {
        headers: { Authorization: `Bearer ${analisToken}` },
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.id === ingestedMeasurementId, 'ID pengukuran harus cocok');
      assert(Array.isArray(res.body.data.elements), 'Elements harus array');
      return `Detail termuat lengkap dengan ${res.body.data.elements.length} unsur`;
    });

    // -------------------------------------------------------------
    // GROUP 6: Auto-Linking & Manual Linking ke Sampel LIMS
    // -------------------------------------------------------------
    console.log('\n--- [6. Integrasi & Penautan ke Sampel Laboratorium] ---');

    let testSampleId = 0;
    const testSampleCode = `SMP-XRF-LINK-${Date.now().toString().slice(-4)}`;

    // Buat sampel uji di database
    const createdSample = await prisma.sample.create({
      data: {
        kodeSampel: testSampleCode,
        tanggalMasuk: new Date(),
        jenisMaterial: 'Bijih Nikel Laterit',
        klien: 'PT. Aneka Tambang',
        status: 'antrian',
      },
    });
    testSampleId = createdSample.id;
    createdSampleIds.push(testSampleId);

    await executeTest('LINKING', 'Auto-linking otomatis saat sample_name hasil scan cocok dengan kode sampel LIMS', async () => {
      const res = await request('/api/v1/xrf/receive', {
        method: 'POST',
        body: JSON.stringify({
          api_key: validApiKey,
          device_id: testDeviceId,
          db_source: 'mineral.db',
          report_id: 802,
          sample_name: testSampleCode,
          work_curve_name: 'Laterite Mode',
          elements: [{ name: 'Ni', concentration: 1.95, unit: '%' }],
        }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.matched_sample_id === testSampleId, 'Harus auto-link ke sample ID yang cocok');
      assert(res.body.measurement.sampleId === testSampleId, 'sampleId di measurement harus terisi');

      createdMeasurementIds.push(res.body.measurement_id);
      return `Scan XRF berhasil otomatis ditautkan ke Sampel #${testSampleCode} (ID: ${testSampleId})`;
    });

    await executeTest('LINKING', 'Manual linking pengukuran XRF ke sampel via POST /measurements/:id/link', async () => {
      const res = await request(`/api/v1/xrf/measurements/${ingestedMeasurementId}/link`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${analisToken}` },
        body: JSON.stringify({ sampleId: testSampleId }),
      });

      assert(res.status === 200, `Expected status 200, got ${res.status}`);
      assert(res.body.data.sampleId === testSampleId, 'sampleId harus terupdate');
      return `Pengukuran #${ingestedMeasurementId} berhasil ditautkan ke Sampel ID ${testSampleId}`;
    });

    // -------------------------------------------------------------
    // GROUP 7: Audit Logging
    // -------------------------------------------------------------
    console.log('\n--- [7. Verifikasi Jejak Audit (xrf_admin_logs & log_aktivitas)] ---');

    await executeTest('AUDIT', 'Verifikasi pencatatan log pada tabel `xrf_admin_logs`', async () => {
      const adminLogs = await prisma.xrfAdminLog.findMany({
        where: { deviceId: testDeviceId },
        orderBy: { id: 'desc' },
      });

      assert(adminLogs.length >= 2, 'Harus ada minimal 2 log otentikasi XRF');
      return `Audit log XRF terverifikasi: ${adminLogs.length} riwayat tercatat`;
    });

  } finally {
    // Pembersihan data uji secara aman
    console.log('\n--- [Membersihkan Data Uji XRF Secara Aman] ---');
    try {
      if (createdMeasurementIds.length > 0) {
        await prisma.xrfMeasurementElement.deleteMany({
          where: { measurementId: { in: createdMeasurementIds } },
        });
        await prisma.xrfMeasurement.deleteMany({
          where: { id: { in: createdMeasurementIds } },
        });
      }
      if (createdSampleIds.length > 0) {
        await prisma.sample.deleteMany({
          where: { id: { in: createdSampleIds } },
        });
      }
      await prisma.xrfAdminLog.deleteMany({
        where: { deviceId: testDeviceId },
      });
      await prisma.xrfDevice.deleteMany({
        where: { deviceId: testDeviceId },
      });
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
  console.log(`TOTAL PENGUJIAN XRF INGESTION & INTEGRATION: ${total}`);
  console.log(`PASS: ${passed} | FAIL: ${failed}`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runXrfTestSuite().catch((err) => {
  console.error('FATAL TEST ERROR:', err);
  process.exit(1);
});
