import { app } from '../src/app.js';
import { prisma } from '../src/config/database.js';
import { PasswordUtil } from '../src/modules/auth/utils/password.util.js';
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

async function runMasterTestSuite() {
  console.log('================================================================');
  console.log('AISPEKTRA LIMS — MASTER COMPREHENSIVE END-TO-END TEST SUITE');
  console.log('Lingkungan: Database asli `labmineral` + Server Node.js & PHP');
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

  // -------------------------------------------------------------
  // GROUP 1: Core Password Cryptography & Defense
  // -------------------------------------------------------------
  console.log('--- [1. Password Security & Legacy Verification] ---');

  await executeTest('KRIPTOGRAFI', 'Verifikasi bcrypt format PHP ($2y$) dengan password valid', async () => {
    const legacyPhpHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    const result = await PasswordUtil.verifyAndCheckRehash('password', legacyPhpHash);
    assert(result.isValid === true, 'Password valid harus menghasilkan isValid: true');
    assert(result.needsRehash === true, 'Hash legacy $2y$ harus ditandai needsRehash: true');
    return 'Hash $2y$ legacy diverifikasi sukses & ditandai needsRehash';
  });

  await executeTest('KRIPTOGRAFI', 'Penolakan password salah terhadap hash legacy', async () => {
    const legacyPhpHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    const result = await PasswordUtil.verifyAndCheckRehash('wrongpass', legacyPhpHash);
    assert(result.isValid === false, 'Password salah wajib ditolak');
  });

  await executeTest('KRIPTOGRAFI', 'Pertahanan terhadap String Hash Injection (Anti-Bypass)', async () => {
    const legacyPhpHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    const result = await PasswordUtil.verifyAndCheckRehash(legacyPhpHash, legacyPhpHash);
    assert(result.isValid === false, 'String hash mentah tidak boleh diizinkan login');
    return 'String hash mentah ditolak aman tanpa bypass';
  });

  await executeTest('KRIPTOGRAFI', 'Penolakan format plaintext secara default', async () => {
    const result = await PasswordUtil.verifyAndCheckRehash('password123', 'password123', false);
    assert(result.isValid === false, 'Plaintext tanpa hashing harus ditolak');
  });

  await executeTest('KRIPTOGRAFI', 'Generate hash bcrypt baru format Node.js ($2b$ cost 12)', async () => {
    const newHash = await PasswordUtil.hash('superSecret2026!');
    assert(newHash.startsWith('$2b$') || newHash.startsWith('$2a$'), 'Hash harus berformat $2b$/$2a$');
    const verify = await PasswordUtil.verifyAndCheckRehash('superSecret2026!', newHash);
    assert(verify.isValid === true && verify.needsRehash === false, 'Hash baru harus langsung valid');
    return `Hash generated: ${newHash.substring(0, 15)}...`;
  });

  // -------------------------------------------------------------
  // GROUP 2: JWT Dual Token Engine & Revocation
  // -------------------------------------------------------------
  console.log('\n--- [2. JWT Dual-Token Engine & Token Revocation] ---');

  const samplePayload = { sub: 88, username: 'tester.jwt', role: 'analis' as const };
  const tokens = JwtUtil.generateAuthTokens(samplePayload);

  await executeTest('JWT ENGINE', 'Penerbitan Access Token & Refresh Token terpisah', async () => {
    assert(typeof tokens.accessToken === 'string', 'Access token harus string');
    assert(typeof tokens.refreshToken === 'string', 'Refresh token harus string');
    assert(tokens.accessToken !== tokens.refreshToken, 'Kedua token harus berbeda');
  });

  await executeTest('JWT ENGINE', 'Verifikasi klaim sub, role, dan tokenType: access', async () => {
    const decoded = JwtUtil.verifyAccessToken(tokens.accessToken);
    assert(decoded.sub === 88, 'Sub harus 88');
    assert(decoded.role === 'analis', 'Role harus analis');
    assert(decoded.tokenType === 'access', 'tokenType harus access');
  });

  await executeTest('JWT ENGINE', 'Penolakan Refresh Token saat disalahgunakan sebagai Access Token', async () => {
    let rejected = false;
    try {
      JwtUtil.verifyAccessToken(tokens.refreshToken);
    } catch (e: any) {
      rejected = true;
    }
    assert(rejected, 'Refresh token wajib ditolak jika dipakai sebagai access token');
    return 'Ditolak dengan INVALID_TOKEN_TYPE';
  });

  await executeTest('JWT ENGINE', 'Revokasi Token Seketika (In-Memory Blacklist)', async () => {
    const t = JwtUtil.generateAuthTokens({ sub: 89, username: 'revoke.test', role: 'admin' });
    JwtUtil.revokeToken(t.accessToken);
    let errorThrown = false;
    try {
      JwtUtil.verifyAccessToken(t.accessToken);
    } catch (e: any) {
      errorThrown = e.message.includes('dicabut') || e.code === 'TOKEN_REVOKED';
    }
    assert(errorThrown, 'Token dicabut harus ditolak seketika');
    return 'Token dicabut langsung ditolak (TOKEN_REVOKED)';
  });

  // -------------------------------------------------------------
  // GROUP 3: Live Database Tests (labmineral) via Backend REST API
  // -------------------------------------------------------------
  console.log('\n--- [3. Live Database (labmineral) End-to-End REST API] ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 3.1 Health Check
    await executeTest('BACKEND API', 'GET /health merespon HTTP 200 operational', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.status === 'success', 'Status harus success');
      return `Uptime: ${body.data.uptime.toFixed(2)}s, Env: ${body.data.environment}`;
    });

    // 3.2 Login Berbagai Role Database
    const rolesToTest = [
      { username: 'admin', expectedRole: 'admin' },
      { username: 'supervisor', expectedRole: 'supervisor' },
      { username: 'rani.d', expectedRole: 'analis' },
      { username: 'aneka.tm', expectedRole: 'client' },
    ];

    for (const userRole of rolesToTest) {
      await executeTest('BACKEND API', `Login live akun '${userRole.username}' (role: ${userRole.expectedRole})`, async () => {
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: userRole.username,
            password: 'password',
          }),
        });
        const body = await res.json();
        assert(res.status === 200, `Login gagal untuk ${userRole.username}: ${JSON.stringify(body)}`);
        assert(body.data.user.role === userRole.expectedRole, `Role harus ${userRole.expectedRole}`);
        assert(body.data.tokens.accessToken, 'Harus mengembalikan access token');
        return `Sukses: ${body.data.user.nama} (${body.data.user.role})`;
      });
    }

    // 3.3 Protected Endpoint Profile
    let adminAccessToken = '';
    let adminRefreshToken = '';

    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password' }),
    });
    const loginData = await loginRes.json();
    adminAccessToken = loginData.data.tokens.accessToken;
    adminRefreshToken = loginData.data.tokens.refreshToken;

    await executeTest('BACKEND API', 'GET /api/v1/auth/me mengembalikan profil pengguna terotentikasi', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.username === 'admin', 'Username harus admin');
      assert(body.data.role === 'admin', 'Role harus admin');
      return `Profil tervalidasi: ID ${body.data.id} - ${body.data.nama}`;
    });

    await executeTest('BACKEND API', 'GET /api/v1/auth/me tanpa token ditolak HTTP 401 UNAUTHORIZED', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`);
      assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    await executeTest('BACKEND API', 'GET /api/v1/auth/me dengan token palsu ditolak HTTP 401 INVALID_TOKEN', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: 'Bearer token.palsu.ngawur' },
      });
      assert(res.status === 401, `Expected 401, got ${res.status}`);
    });

    // 3.4 Refresh Token Rotation
    await executeTest('BACKEND API', 'POST /api/v1/auth/refresh rotasi token berhasil', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: adminRefreshToken }),
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.data.accessToken && body.data.refreshToken, 'Harus menghasilkan token baru');
      
      // Update untuk uji logout
      adminAccessToken = body.data.accessToken;
      adminRefreshToken = body.data.refreshToken;
      return 'Diterbitkan pasangan token baru';
    });

    // 3.5 Logout & Blacklist Check
    await executeTest('BACKEND API', 'POST /api/v1/auth/logout mencabut sesi pengguna', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAccessToken}`,
        },
        body: JSON.stringify({ refreshToken: adminRefreshToken }),
      });
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      return 'Sesi dan token berhasil direvokasi';
    });

    await executeTest('BACKEND API', 'Token yang dicabut ditolak pada akses berikutnya (TOKEN_REVOKED)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${adminAccessToken}` },
      });
      const body = await res.json();
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(body.code === 'TOKEN_REVOKED', `Expected TOKEN_REVOKED, got ${body.code}`);
    });

    // 3.6 Pertahanan Input & Error Handling
    await executeTest('KEAMANAN HTTP', 'Payload login kosong ditolak HTTP 400 (Zod Validation)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert(res.status === 400, `Expected 400, got ${res.status}`);
    });

    await executeTest('KEAMANAN HTTP', 'JSON Payload rusak/terpotong ditolak HTTP 400 (MALFORMED_JSON)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"username": "admin", "password": ',
      });
      const body = await res.json();
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(body.code === 'MALFORMED_JSON', 'Code harus MALFORMED_JSON');
    });

    await executeTest('KEAMANAN HTTP', 'Rute API tidak terdaftar ditolak HTTP 404 (ENDPOINT_NOT_FOUND)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/unknown-endpoint`);
      assert(res.status === 404, `Expected 404, got ${res.status}`);
    });

    await executeTest('KEAMANAN HTTP', 'Security Headers (Helmet) & Rate Limiting Headers terpasang', async () => {
      const res = await fetch(`${baseUrl}/health`);
      assert(res.headers.has('x-content-type-options'), 'Harus memuat x-content-type-options');
      assert(res.headers.has('strict-transport-security'), 'Harus memuat strict-transport-security');
      return 'Header Helmet terverifikasi aktif';
    });

    // 3.7 Audit Log di database
    await executeTest('AUDIT TRAIL', 'Audit log aktivitas masuk ke tabel `log_aktivitas` database labmineral', async () => {
      const latestLogs = await prisma.activityLog.findMany({
        where: { modul: 'auth' },
        orderBy: { id: 'desc' },
        take: 3,
      });
      assert(latestLogs.length > 0, 'Harus ada data log aktivitas modul auth');
      return `Log terakhir: id=${latestLogs[0].id}, aksi="${latestLogs[0].aksi}"`;
    });

  } finally {
    server.close();
    await prisma.$disconnect();
  }

  // -------------------------------------------------------------
  // GROUP 4: Legacy PHP System Integration (localhost:8000)
  // -------------------------------------------------------------
  console.log('\n--- [4. Legacy PHP Application & Endpoints (localhost:8000)] ---');

  const phpBaseUrl = 'http://localhost:8000';

  await executeTest('PHP LEGACY', 'Koneksi database PHP asli via check_db.php', async () => {
    const res = await fetch(`${phpBaseUrl}/check_db.php`);
    const text = await res.text();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(text.includes('Connected successfully to labmineral'), 'Harus terhubung ke labmineral');
    return 'Koneksi PHP ke DB labmineral OK';
  });

  await executeTest('PHP LEGACY', 'Endpoint Dokumentasi & Health XRF Admin (GET api_xrf_admin_auth.php)', async () => {
    const res = await fetch(`${phpBaseUrl}/api/api_xrf_admin_auth.php`);
    const body = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(body.status === 'online', 'Status harus online');
    return `Service: ${body.service} (${body.status})`;
  });

  await executeTest('PHP LEGACY', 'Autentikasi XRF Admin PHP (POST api_xrf_admin_auth.php)', async () => {
    const res = await fetch(`${phpBaseUrl}/api/api_xrf_admin_auth.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password' }),
    });
    const body = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}: ${JSON.stringify(body)}`);
    assert(body.status === 'success', 'Status harus success');
    assert(body.token, 'Token XRF admin harus diterbitkan');
    return `Token terbit: ${body.token.substring(0, 16)}...`;
  });

  await executeTest('PHP LEGACY', 'Autentikasi XRF Supervisor PHP (POST api_xrf_admin_auth.php)', async () => {
    const res = await fetch(`${phpBaseUrl}/api/api_xrf_admin_auth.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'supervisor', password: 'password' }),
    });
    const body = await res.json();
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(body.status === 'success', 'Status harus success');
    return `Supervisor user: ${body.user.nama}`;
  });

  await executeTest('PHP LEGACY', 'Pembatasan Role XRF Admin: Analis dilarang membuka XRF admin (HTTP 403)', async () => {
    const res = await fetch(`${phpBaseUrl}/api/api_xrf_admin_auth.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'rani.d', password: 'password' }),
    });
    const body = await res.json();
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(body.status === 'error', 'Harus mengembalikan error role');
    return 'Role analis ditolak dengan pesan otorisasi yang tepat';
  });

  await executeTest('PHP LEGACY', 'Web Portal Login PHP (POST /actions/simpan_login.php) redirect ke dashboard', async () => {
    const res = await fetch(`${phpBaseUrl}/actions/simpan_login.php`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=admin&password=password',
    });
    assert(res.status === 302, `Expected 302, got ${res.status}`);
    const location = res.headers.get('location') || '';
    assert(location.includes('dashboard.php'), `Redirect harus ke dashboard.php, didapat: ${location}`);
    return `Redirect OK ke ${location}`;
  });

  await executeTest('PHP LEGACY', 'Web Portal Login PHP dengan password salah redirect ke index.php', async () => {
    const res = await fetch(`${phpBaseUrl}/actions/simpan_login.php`, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=admin&password=wrongpass',
    });
    assert(res.status === 302, `Expected 302, got ${res.status}`);
    const location = res.headers.get('location') || '';
    assert(location.includes('index.php'), `Redirect harus ke index.php, didapat: ${location}`);
    return `Ditolak & redirect ke ${location}`;
  });

  // -------------------------------------------------------------
  // REKAPITULASI HASIL
  // -------------------------------------------------------------
  const totalPassed = results.filter((r) => r.status === 'PASS').length;
  const totalFailed = results.filter((r) => r.status === 'FAIL').length;

  console.log('\n================================================================');
  console.log(`TOTAL PENGUJIAN SELESAI: ${results.length}`);
  console.log(`PASS: ${totalPassed} | FAIL: ${totalFailed}`);
  console.log('================================================================');

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runMasterTestSuite().catch((err) => {
  console.error('Fatal Master Test Error:', err);
  process.exit(1);
});
