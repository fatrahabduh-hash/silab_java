import { prisma } from '../../config/database.js';
import { User } from '@prisma/client';

export class AuthRepository {
  /**
   * Cari pengguna berdasarkan username atau email
   */
  static async findByIdentifier(identifier: string): Promise<User | null> {
    return prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });
  }

  /**
   * Cari pengguna berdasarkan ID
   */
  static async findById(id: number): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Update hash password pengguna (digunakan untuk auto-rehash password legacy)
   */
  static async updatePassword(id: number, newHash: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { password: newHash },
    });
  }

  /**
   * Ambil daftar seluruh pengguna (tanpa field password)
   */
  static async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    return prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: [{ role: 'asc' }, { nama: 'asc' }],
    });
  }

  /**
   * Buat pengguna baru
   */
  static async createUser(data: {
    nama: string;
    username: string;
    passwordHash: string;
    email?: string | null;
    role: string;
    status: string;
  }): Promise<Omit<User, 'password'>> {
    return prisma.user.create({
      data: {
        nama: data.nama,
        username: data.username,
        password: data.passwordHash,
        email: data.email || null,
        role: data.role as any,
        status: data.status as any,
      },
      select: {
        id: true,
        nama: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });
  }

  /**
   * Catat audit log upaya autentikasi ke log_aktivitas (tanpa menyimpan data sensitif)
   */
  static async logAuthAttempt(params: {
    userId?: number | null;
    action: string;
    ipAddress?: string;
  }): Promise<void> {
    try {
      // Pastikan hanya aksi deskriptif non-sensitif yang dicatat ke tabel log_aktivitas legacy
      const sanitasiAksi = params.ipAddress
        ? `${params.action} [IP: ${params.ipAddress}]`
        : params.action;

      await prisma.activityLog.create({
        data: {
          penggunaId: params.userId || null,
          aksi: sanitasiAksi.substring(0, 200),
          modul: 'auth',
        },
      });
    } catch (error) {
      // Jangan biarkan kegagalan audit logging menghentikan alur utama aplikasi
      console.error('[AuthRepository.logAuthAttempt Error]:', error);
    }
  }
}
