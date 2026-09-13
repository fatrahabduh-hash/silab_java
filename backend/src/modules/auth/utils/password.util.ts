import bcrypt from 'bcrypt';

// Regex standar untuk format bcrypt ($2a$, $2b$, $2y$ dengan cost 04-31 dan salt+hash 53 karakter)
const BCRYPT_REGEX = /^\$2[ayb]\$[0-9]{2}\$[A-Za-z0-9./]{53}$/;

export class PasswordUtil {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hash password baru menggunakan bcrypt dengan cost factor 12
   */
  static async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.SALT_ROUNDS);
  }

  /**
   * Verifikasi password dengan dukungan migrasi legacy PHP ($2y$ hash).
   * Penting:
   * 1. Password input TIDAK di-trim untuk menjaga integritas karakter.
   * 2. Hash yang dikenali sebagai bcrypt WAJIB diverifikasi lewat algoritma bcrypt; jika gagal langsung ditolak.
   * 3. Fallback plaintext dinonaktifkan secara default dan TIDAK PERNAH menerima kecocokan langsung dengan string hash.
   */
  static async verifyAndCheckRehash(
    plainText: string,
    storedHash: string,
    allowLegacyPlaintext = false
  ): Promise<{ isValid: boolean; needsRehash: boolean }> {
    if (!storedHash || !plainText) {
      return { isValid: false, needsRehash: false };
    }

    // 1. Cek apakah storedHash merupakan format bcrypt ($2y$, $2a$, atau $2b$)
    const isBcryptHash = BCRYPT_REGEX.test(storedHash);

    if (isBcryptHash) {
      // Normalisasi $2y$ (PHP legacy default) ke $2a$ agar kompatibel penuh dengan Node.js bcrypt
      let normalizedHash = storedHash;
      if (storedHash.startsWith('$2y$')) {
        normalizedHash = '$2a$' + storedHash.substring(4);
      }

      try {
        const isMatch = await bcrypt.compare(plainText, normalizedHash);
        if (isMatch) {
          // Re-hash jika hash legacy masih memakai prefix $2y$
          const needsRehash = storedHash.startsWith('$2y$');
          return { isValid: true, needsRehash };
        }
      } catch {
        return { isValid: false, needsRehash: false };
      }

      // Jika formatnya bcrypt tapi tidak cocok, TOLAK. Jangan fallback ke plaintext!
      return { isValid: false, needsRehash: false };
    }

    // 2. Jika bukan format bcrypt:
    // Dukungan plaintext hanya aktif jika secara eksplisit diaktifkan (misal untuk seed development lama)
    // dan input BUKAN merupakan string hash itu sendiri.
    if (allowLegacyPlaintext) {
      if (storedHash === plainText) {
        return { isValid: true, needsRehash: true };
      }
    }

    // Default: Tolak format hash yang tidak dikenali
    return { isValid: false, needsRehash: false };
  }
}
