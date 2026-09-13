import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z
      .string({ required_error: 'Username atau Email wajib diisi' })
      .trim()
      .min(3, 'Username minimal 3 karakter'),
    password: z
      .string({ required_error: 'Password wajib diisi' })
      .min(1, 'Password tidak boleh kosong'),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z
      .string({ required_error: 'Refresh token wajib disertakan' })
      .min(1, 'Refresh token tidak boleh kosong'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
