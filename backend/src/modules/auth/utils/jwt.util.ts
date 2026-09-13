import jwt, { SignOptions, VerifyOptions } from 'jsonwebtoken';
import { ENV } from '../../../config/env.js';
import { JwtUserPayload, AuthTokens } from '../auth.types.js';
import { AppError } from '../../../common/errors/app-error.js';

const ISSUER = 'aispektra-lims';
const AUDIENCE = 'aispektra-api';
const ALGORITHM = 'HS256';

// In-memory token revocation registry (Blacklist) untuk Phase 1
const revokedTokens = new Set<string>();

export class JwtUtil {
  static generateAuthTokens(payload: Omit<JwtUserPayload, 'tokenType'>): AuthTokens {
    if (ENV.JWT_SECRET === ENV.JWT_REFRESH_SECRET) {
      throw new Error('[Security Error] JWT_SECRET and JWT_REFRESH_SECRET must be strictly different.');
    }

    const accessPayload: JwtUserPayload = {
      ...payload,
      tokenType: 'access',
    };

    const refreshPayload: JwtUserPayload = {
      ...payload,
      tokenType: 'refresh',
    };

    const accessSignOptions: SignOptions = {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: ENV.JWT_EXPIRES_IN as any,
    };

    const refreshSignOptions: SignOptions = {
      algorithm: ALGORITHM,
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: ENV.JWT_REFRESH_EXPIRES_IN as any,
    };

    const accessToken = jwt.sign(accessPayload, ENV.JWT_SECRET, accessSignOptions);
    const refreshToken = jwt.sign(refreshPayload, ENV.JWT_REFRESH_SECRET, refreshSignOptions);

    return {
      accessToken,
      refreshToken,
      expiresIn: ENV.JWT_EXPIRES_IN,
    };
  }

  static verifyAccessToken(token: string): JwtUserPayload {
    if (revokedTokens.has(token)) {
      throw AppError.unauthorized('Token telah dicabut (revoked)', 'TOKEN_REVOKED');
    }

    const verifyOptions: VerifyOptions = {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
    };

    let decoded: any;
    try {
      decoded = jwt.verify(token, ENV.JWT_SECRET, verifyOptions);
    } catch {
      throw AppError.unauthorized('Sesi login telah kedaluwarsa atau token tidak valid', 'INVALID_TOKEN');
    }

    const payload = decoded as unknown as JwtUserPayload;
    if (payload.tokenType !== 'access') {
      throw AppError.unauthorized('Token yang diberikan bukan Access Token yang valid', 'INVALID_TOKEN_TYPE');
    }

    return payload;
  }

  static verifyRefreshToken(token: string): JwtUserPayload {
    if (revokedTokens.has(token)) {
      throw AppError.unauthorized('Refresh token telah dicabut atau sudah digunakan', 'TOKEN_REVOKED');
    }

    const verifyOptions: VerifyOptions = {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
    };

    let decoded: any;
    try {
      decoded = jwt.verify(token, ENV.JWT_REFRESH_SECRET, verifyOptions);
    } catch {
      throw AppError.unauthorized('Refresh token telah kedaluwarsa atau tidak valid', 'INVALID_REFRESH_TOKEN');
    }

    const payload = decoded as unknown as JwtUserPayload;
    if (payload.tokenType !== 'refresh') {
      throw AppError.unauthorized('Token yang diberikan bukan Refresh Token yang valid', 'INVALID_TOKEN_TYPE');
    }

    return payload;
  }

  static revokeToken(token: string): void {
    revokedTokens.add(token);
  }

  static isRevoked(token: string): boolean {
    return revokedTokens.has(token);
  }
}
