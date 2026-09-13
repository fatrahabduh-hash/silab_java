import { PasswordUtil } from '../src/modules/auth/utils/password.util.js';
import { JwtUtil } from '../src/modules/auth/utils/jwt.util.js';
import { app } from '../src/app.js';
import http from 'http';

// Helper assertion
function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[TEST FAILED] ${message}`);
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('AISPEKTRA LIMS Backend — Phase 1 Test Suite');
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

  // ----------------------------------------------------
  // 1. Password Security & Legacy Verification Tests
  // ----------------------------------------------------
  console.log('--- [1. Password Security & Legacy Compatibility] ---');

  await testCase('Verifikasi format legacy bcrypt PHP ($2y$) dengan password benar', async () => {
    // Hash bcrypt bawaan PHP untuk string 'password'
    const legacyPhpHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    const result = await PasswordUtil.verifyAndCheckRehash('password', legacyPhpHash);
    assert(result.isValid === true, 'Password valid harus menghasilkan isValid: true');
    assert(result.needsRehash === true, 'Hash legacy $2y$ harus ditandai needsRehash: true');
  });

  await testCase('Password salah terhadap hash legacy PHP ditolak', async () => {
    const legacyPhpHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    const result = await PasswordUtil.verifyAndCheckRehash('wrongpassword', legacyPhpHash);
    assert(result.isValid === false, 'Password salah harus menghasilkan isValid: false');
  });

  await testCase('Penyerang menginput string hash langsung sebagai password wajib DITOLAK', async () => {
    const legacyPhpHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
    // Penyerang mencoba bypass dengan menyalin hash yang bocor
    const result = await PasswordUtil.verifyAndCheckRehash(legacyPhpHash, legacyPhpHash);
    assert(result.isValid === false, 'Input berupa string hash tidak boleh diterima');
  });

  await testCase('Format plaintext tidak dikenali ditolak secara default (allowLegacyPlaintext=false)', async () => {
    const result = await PasswordUtil.verifyAndCheckRehash('client123', 'client123', false);
    assert(result.isValid === false, 'Plaintext tanpa format hash harus ditolak secara default');
  });

  await testCase('Hashing password baru menghasilkan format bcrypt Node.js standar', async () => {
    const newHash = await PasswordUtil.hash('rahasiaSuper2026!');
    assert(newHash.startsWith('$2b$') || newHash.startsWith('$2a$'), 'Hash baru harus format bcrypt');
    const verifyNew = await PasswordUtil.verifyAndCheckRehash('rahasiaSuper2026!', newHash);
    assert(verifyNew.isValid === true, 'Password baru harus berhasil diverifikasi');
    assert(verifyNew.needsRehash === false, 'Hash baru standar tidak membutuhkan rehash');
  });

  // ----------------------------------------------------
  // 2. JWT Dual Token, Claims, & Revocation Tests
  // ----------------------------------------------------
  console.log('\n--- [2. JWT Dual Token, Claims, & Revocation] ---');

  const sampleUser = { sub: 99, username: 'tester.analis', role: 'analis' as const };
  const tokens = JwtUtil.generateAuthTokens(sampleUser);

  await testCase('Access Token dan Refresh Token berhasil digenerate dan memiliki signature berbeda', async () => {
    assert(typeof tokens.accessToken === 'string', 'Access token harus string');
    assert(typeof tokens.refreshToken === 'string', 'Refresh token harus string');
    assert(tokens.accessToken !== tokens.refreshToken, 'Access dan Refresh token tidak boleh identik');
  });

  await testCase('Verifikasi Access Token menghasilkan claims yang benar dengan tokenType=access', async () => {
    const decoded = JwtUtil.verifyAccessToken(tokens.accessToken);
    assert(decoded.sub === 99, 'Subject ID harus 99');
    assert(decoded.role === 'analis', 'Role harus analis');
    assert(decoded.tokenType === 'access', 'tokenType harus access');
  });

  await testCase('Refresh Token ditolak jika digunakan pada verifikasi Access Token', async () => {
    let errorThrown = false;
    try {
      JwtUtil.verifyAccessToken(tokens.refreshToken);
    } catch (err: any) {
      errorThrown = true;
      assert(
        err.code === 'INVALID_TOKEN' ||
          err.code === 'INVALID_TOKEN_TYPE' ||
          err.code === 'UNAUTHORIZED' ||
          err.message.includes('tidak valid') ||
          err.message.includes('Access Token'),
        'Pesan error harus sesuai'
      );
    }
    assert(errorThrown, 'Refresh token wajib ditolak saat diverifikasi sebagai access token');
  });

  await testCase('Pencabutan token (Revocation/Logout) membatalkan validitas token', async () => {
    const tempTokens = JwtUtil.generateAuthTokens({ sub: 100, username: 'revoke.user', role: 'analis' });
    JwtUtil.revokeToken(tempTokens.accessToken);
    
    let errorThrown = false;
    try {
      JwtUtil.verifyAccessToken(tempTokens.accessToken);
    } catch (err: any) {
      errorThrown = true;
      assert(err.code === 'TOKEN_REVOKED' || err.message.includes('dicabut'), 'Token dicabut harus ditolak');
    }
    assert(errorThrown, 'Token yang telah dicabut harus memicu error');
  });

  // ----------------------------------------------------
  // 3. HTTP Server Endpoints Integration Tests
  // ----------------------------------------------------
  console.log('\n--- [3. HTTP Endpoints & Security Filters] ---');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const port = (server.address() as any).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await testCase('Endpoint GET /health merespon HTTP 200 dengan status operational', async () => {
      const res = await fetch(`${baseUrl}/health`);
      const body = await res.json();
      assert(res.status === 200, `Expected 200, got ${res.status}`);
      assert(body.status === 'success', 'Body status harus success');
      assert(body.data.environment === 'development', 'Environment harus development');
    });

    await testCase('Endpoint GET /api/v1/auth/me tanpa Authorization header ditolak HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`);
      const body = await res.json();
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(body.status === 'fail', 'Status harus fail');
      assert(body.code === 'UNAUTHORIZED', 'Code harus UNAUTHORIZED');
    });

    await testCase('Endpoint GET /api/v1/auth/me dengan token acak/palsu ditolak HTTP 401', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/me`, {
        headers: { Authorization: 'Bearer token.palsu.yang.tidak.valid' },
      });
      const body = await res.json();
      assert(res.status === 401, `Expected 401, got ${res.status}`);
      assert(body.code === 'UNAUTHORIZED' || body.code === 'INVALID_TOKEN', 'Harus ditolak sebagai INVALID_TOKEN');
    });

    await testCase('Endpoint POST /api/v1/auth/login dengan payload tidak lengkap ditolak HTTP 400 (Zod)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: '' }), // password tidak ada
      });
      const body = await res.json();
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(body.code === 'VALIDATION_ERROR', 'Code harus VALIDATION_ERROR');
      assert(Array.isArray(body.errors), 'Errors harus berupa array');
    });

    await testCase('Request dengan JSON sintaks rusak (Malformed JSON) ditolak HTTP 400', async () => {
      const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"username": "admin", "password": ', // json terpotong/rusak
      });
      const body = await res.json();
      assert(res.status === 400, `Expected 400, got ${res.status}`);
      assert(body.code === 'MALFORMED_JSON', 'Code harus MALFORMED_JSON');
    });

    await testCase('Endpoint rute acak tidak terdaftar ditolak HTTP 404 (NotFoundHandler)', async () => {
      const res = await fetch(`${baseUrl}/api/v1/rute-ngawur`);
      const body = await res.json();
      assert(res.status === 404, `Expected 404, got ${res.status}`);
      assert(body.code === 'ENDPOINT_NOT_FOUND', 'Code harus ENDPOINT_NOT_FOUND');
    });
  } finally {
    server.close();
  }

  console.log('\n====================================================');
  console.log(`HASIL TEST: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
