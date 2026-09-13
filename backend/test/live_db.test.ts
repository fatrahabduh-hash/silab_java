import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import http from 'http';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

async function runLiveDbTests() {
  console.log('====================================================');
  console.log('AISPEKTRA LIMS — Live Database (labmineral) Test Suite');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function testCase(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✔ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ✖ FAIL: ${name} -> ${err.message}`);
      failed++;
    }
  }

  // 1. Database Connectivity
  await testCase('Prisma dapat terkoneksi dan membaca database asli `labmineral`', async () => {
    const userCount = await prisma.user.count();
    assert(userCount > 0, `Harus menemukan data pengguna di database labmineral (ditemukan: ${userCount})`);
    console.log(`     (Jumlah akun pengguna terdaftar: ${userCount})`);
  });

  await testCase('Akun `admin` terdaftar dan berstatus aktif', async () => {
    const admin = await prisma.user.findUnique({ where: { username: 'admin' } });
    assert(admin !== null, 'Akun admin harus ada');
    assert(admin?.role === 'admin', 'Role harus admin');
    assert(admin?.status === 'aktif', 'Status akun harus aktif');
  });

  // 2. HTTP Server & Live Auth API Endpoints
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    let accessToken = '';
    let refreshToken = '';

    await testCase('Login berhasil dengan akun live `admin`', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'password',
        }),
      });

      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
      assert(body.status === 'success', 'Status harus success');
      assert(body.data.user.username === 'admin', 'Username harus admin');
      assert(body.data.tokens.accessToken, 'Access token harus ada');
      assert(body.data.tokens.refreshToken, 'Refresh token harus ada');

      accessToken = body.data.tokens.accessToken;
      refreshToken = body.data.tokens.refreshToken;
    });

    await testCase('Endpoint protected GET /api/v1/auth/me mengembalikan profil admin dari DB', async () => {
      assert(accessToken !== '', 'Access token harus tersedia dari test login');
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.status === 'success', 'Status harus success');
      assert(body.data.username === 'admin', 'Username harus admin');
      assert(body.data.role === 'admin', 'Role harus admin');
    });

    await testCase('Refresh token menghasilkan sepasang token baru', async () => {
      assert(refreshToken !== '', 'Refresh token harus tersedia');
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
      assert(body.data.accessToken, 'Harus menerbitkan accessToken baru');
      assert(body.data.refreshToken, 'Harus menerbitkan refreshToken baru');

      // Update token untuk langkah berikutnya
      accessToken = body.data.accessToken;
      refreshToken = body.data.refreshToken;
    });

    await testCase('Pencabutan sesi via POST /api/v1/auth/logout', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ refreshToken }),
      });

      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.status === 'success', 'Logout harus success');
    });

    await testCase('Access token yang sudah di-logout ditolak pada request berikutnya', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const body = await res.json();
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(body.code === 'TOKEN_REVOKED', `Code harus TOKEN_REVOKED (didapat: ${body.code})`);
    });

    await testCase('Login dengan password salah ditolak dengan pesan seragam', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'admin',
          password: 'PasswordSalah123!',
        }),
      });

      const body = await res.json();
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(body.code === 'UNAUTHORIZED', 'Code harus UNAUTHORIZED');
    });

    await testCase('Audit log aktivitas tercatat di tabel log_aktivitas', async () => {
      const logs = await prisma.activityLog.findMany({
        where: { modul: 'auth' },
        orderBy: { id: 'desc' },
        take: 3,
      });

      assert(logs.length > 0, 'Audit log di tabel log_aktivitas harus bertambah');
      console.log(`     (Audit log terbaru: id=${logs[0].id}, aksi="${logs[0].aksi}")`);
    });

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  console.log('\n====================================================');
  console.log(`HASIL LIVE DB TEST: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runLiveDbTests().catch((err) => {
  console.error('Fatal live test error:', err);
  process.exit(1);
});
