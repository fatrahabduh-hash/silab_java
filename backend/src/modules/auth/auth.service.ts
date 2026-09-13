import { AuthRepository } from './auth.repository.js';
import { PasswordUtil } from './utils/password.util.js';
import { JwtUtil } from './utils/jwt.util.js';
import { AppError } from '../../common/errors/app-error.js';
import { Logger } from '../../common/utils/logger.js';
import { LoginInput, RefreshTokenInput } from './auth.validation.js';
import { LoginResult, UserProfileResponse, UserRole, AuthTokens } from './auth.types.js';

export class AuthService {
  /**
   * Alur proses login pengguna lengkap dengan verifikasi password aman & auto-rehash
   */
  static async login(input: LoginInput, clientIp?: string): Promise<LoginResult> {
    const user = await AuthRepository.findByIdentifier(input.username);

    // Mencegah enumerasi akun: response identik jika akun tidak ada atau password salah
    if (!user) {
      await AuthRepository.logAuthAttempt({
        action: 'AUTH_LOGIN_FAILED',
        ipAddress: clientIp,
      });
      throw AppError.unauthorized('Kombinasi kredensial (username/password) tidak valid');
    }

    if (user.status !== 'aktif') {
      await AuthRepository.logAuthAttempt({
        userId: user.id,
        action: 'AUTH_LOGIN_BLOCKED_INACTIVE',
        ipAddress: clientIp,
      });
      throw AppError.forbidden('Akun pengguna Anda saat ini berstatus non-aktif');
    }

    // Verifikasi password (plaintext fallback dinonaktifkan secara default)
    const { isValid, needsRehash } = await PasswordUtil.verifyAndCheckRehash(input.password, user.password, false);

    if (!isValid) {
      await AuthRepository.logAuthAttempt({
        userId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        ipAddress: clientIp,
      });
      throw AppError.unauthorized('Kombinasi kredensial (username/password) tidak valid');
    }

    // Auto-rehash password legacy $2y$ ke format bcrypt $2a$/$2b$ standar
    if (needsRehash) {
      try {
        const upgradedHash = await PasswordUtil.hash(input.password);
        await AuthRepository.updatePassword(user.id, upgradedHash);
        Logger.info(`[AuthService] Password legacy user '${user.username}' berhasil diperbarui ke bcrypt hash standar.`);
      } catch (err: any) {
        Logger.warn(`[AuthService] Gagal memperbarui hash legacy user '${user.username}': ${err.message}`);
      }
    }

    // Generate JWT Tokens
    const tokenPayload = {
      sub: user.id,
      username: user.username,
      role: user.role as UserRole,
    };
    const tokens = JwtUtil.generateAuthTokens(tokenPayload);

    // Catat log sukses (tanpa menyertakan kredensial maupun token)
    await AuthRepository.logAuthAttempt({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      ipAddress: clientIp,
    });

    const userProfile: UserProfileResponse = {
      id: user.id,
      nama: user.nama,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      status: user.status,
      createdAt: user.createdAt,
    };

    return {
      user: userProfile,
      tokens,
    };
  }

  /**
   * Refresh Token dengan mekanisme rotasi: refresh token lama langsung dicabut
   */
  static async refreshTokens(input: RefreshTokenInput): Promise<AuthTokens> {
    const decoded = JwtUtil.verifyRefreshToken(input.refreshToken);
    const user = await AuthRepository.findById(decoded.sub);

    if (!user || user.status !== 'aktif') {
      throw AppError.unauthorized('Sesi tidak valid atau pengguna sudah tidak aktif');
    }

    // Cabut (revoke) refresh token lama untuk mencegah replay attack
    JwtUtil.revokeToken(input.refreshToken);

    // Terbitkan sepasang token baru (Access + Refresh Token baru)
    return JwtUtil.generateAuthTokens({
      sub: user.id,
      username: user.username,
      role: user.role as UserRole,
    });
  }

  /**
   * Logout: mencabut access token dan/atau refresh token yang aktif
   */
  static async logout(accessToken?: string, refreshToken?: string, userId?: number): Promise<void> {
    if (accessToken) JwtUtil.revokeToken(accessToken);
    if (refreshToken) JwtUtil.revokeToken(refreshToken);

    if (userId) {
      await AuthRepository.logAuthAttempt({
        userId,
        action: 'AUTH_LOGOUT',
      });
    }
  }

  /**
   * Ambil data profil terkini pengguna yang sedang terotentikasi
   */
  static async getCurrentUser(userId: number): Promise<UserProfileResponse> {
    const user = await AuthRepository.findById(userId);
    if (!user) {
      throw AppError.notFound('Data pengguna tidak ditemukan');
    }

    return {
      id: user.id,
      nama: user.nama,
      username: user.username,
      email: user.email,
      role: user.role as UserRole,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
