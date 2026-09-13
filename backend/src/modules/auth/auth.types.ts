export type UserRole = 'admin' | 'supervisor' | 'analis' | 'client' | 'klien';

export interface JwtUserPayload {
  sub: number;
  username: string;
  role: UserRole;
  tokenType: 'access' | 'refresh';
}

export interface UserProfileResponse {
  id: number;
  nama: string;
  username: string;
  email: string | null;
  role: UserRole;
  status: string;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface LoginResult {
  user: UserProfileResponse;
  tokens: AuthTokens;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}
