import { SampleRepository } from './sample.repository.js';
import {
  CreateReceiptInput,
  CreateSampleInput,
  UpdateSampleStatusInput,
  UpdateReceiptStatusInput,
  SampleQueryParams,
  ReceiptQueryParams,
  SampleStatus,
} from './sample.types.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload, UserRole } from '../auth/auth.types.js';
import { AuthRepository } from '../auth/auth.repository.js';

export class SampleService {
  /**
   * Menghasilkan Nomor Penerimaan urut format: REC-YYMM-XXX (Contoh: REC-2609-001)
   */
  static async generateReceiptNumber(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `REC-${yy}${mm}-`;

    const count = await SampleRepository.countReceiptsToday(prefix);
    let nextNum = count + 1;
    let code = `${prefix}${String(nextNum).padStart(3, '0')}`;

    while (await SampleRepository.findReceiptByNomor(code)) {
      nextNum++;
      code = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    return code;
  }

  /**
   * Menghasilkan Kode Sampel urut format: S-YYMM-XXX (Contoh: S-2609-001)
   */
  static async generateSampleCode(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `S-${yy}${mm}-`;

    const count = await SampleRepository.countSamplesToday(prefix);
    let nextNum = count + 1;
    let code = `${prefix}${String(nextNum).padStart(3, '0')}`;

    while (await SampleRepository.findSampleByKode(code)) {
      nextNum++;
      code = `${prefix}${String(nextNum).padStart(3, '0')}`;
    }

    return code;
  }

  /**
   * Catat penerimaan batch sampel baru
   */
  static async createReceipt(input: CreateReceiptInput, user: JwtUserPayload) {
    let nomorPenerimaan = input.nomorPenerimaan?.trim();

    if (!nomorPenerimaan) {
      nomorPenerimaan = await this.generateReceiptNumber();
    } else {
      const existing = await SampleRepository.findReceiptByNomor(nomorPenerimaan);
      if (existing) {
        throw AppError.conflict(
          `Nomor penerimaan '${nomorPenerimaan}' sudah terdaftar dalam sistem`,
          'RECEIPT_NUMBER_EXISTS'
        );
      }
    }

    const tanggalTerima = input.tanggalTerima ? new Date(input.tanggalTerima) : new Date();

    const receipt = await SampleRepository.createReceipt(
      {
        ...input,
        nomorPenerimaan,
        tanggalTerima,
      },
      user.sub
    );

    await SampleRepository.logActivity({
      userId: user.sub,
      action: `PENERIMAAN_CREATED: ${nomorPenerimaan} (${input.klien})`,
      receiptId: receipt.id,
    });

    return SampleRepository.findReceiptById(receipt.id);
  }

  /**
   * Ambil daftar penerimaan sampel
   */
  static async getReceipts(params: ReceiptQueryParams) {
    return SampleRepository.findAllReceipts(params);
  }

  /**
   * Ambil detail penerimaan sampel beserta seluruh sampelnya
   */
  static async getReceiptById(id: number) {
    const receipt = await SampleRepository.findReceiptById(id);
    if (!receipt) {
      throw AppError.notFound(`Data penerimaan sampel dengan ID ${id} tidak ditemukan`, 'RECEIPT_NOT_FOUND');
    }
    return receipt;
  }

  /**
   * Perbarui status batch penerimaan
   */
  static async updateReceiptStatus(
    id: number,
    input: UpdateReceiptStatusInput,
    user: JwtUserPayload
  ) {
    const receipt = await SampleRepository.findReceiptById(id);
    if (!receipt) {
      throw AppError.notFound(`Data penerimaan sampel dengan ID ${id} tidak ditemukan`, 'RECEIPT_NOT_FOUND');
    }

    const updated = await SampleRepository.updateReceipt(id, input);

    await SampleRepository.logActivity({
      userId: user.sub,
      action: `PENERIMAAN_STATUS_UPDATED: ID ${id} -> ${input.status || 'KONFIRMASI'}`,
      receiptId: id,
    });

    return updated;
  }

  /**
   * Registrasi sampel satuan
   */
  static async createSample(input: CreateSampleInput, user: JwtUserPayload) {
    let receiptKlien: string | undefined;

    if (input.penerimaanId) {
      const receipt = await SampleRepository.findReceiptById(input.penerimaanId);
      if (!receipt) {
        throw AppError.notFound(
          `Batch penerimaan dengan ID ${input.penerimaanId} tidak ditemukan`,
          'RECEIPT_NOT_FOUND'
        );
      }
      receiptKlien = receipt.klien;
    }

    let kodeSampel = input.kodeSampel?.trim();
    if (!kodeSampel) {
      kodeSampel = await this.generateSampleCode();
    } else {
      const existing = await SampleRepository.findSampleByKode(kodeSampel);
      if (existing) {
        throw AppError.conflict(
          `Kode sampel '${kodeSampel}' sudah terdaftar dalam sistem`,
          'SAMPLE_CODE_EXISTS'
        );
      }
    }

    const tanggalMasuk = input.tanggalMasuk ? new Date(input.tanggalMasuk) : new Date();

    const sample = await SampleRepository.createSample(
      {
        ...input,
        kodeSampel,
        tanggalMasuk,
        klien: input.klien || receiptKlien || undefined,
      },
      user.sub
    );

    await SampleRepository.logActivity({
      userId: user.sub,
      action: `SAMPEL_REGISTERED: ${kodeSampel} (${input.jenisMaterial})`,
      sampleId: sample.id,
    });

    return SampleRepository.findSampleById(sample.id);
  }

  /**
   * Ambil daftar sampel dengan RBAC scoping (klien hanya bisa melihat miliknya sendiri)
   */
  static async getSamples(params: SampleQueryParams, user: JwtUserPayload) {
    let clientRestriction: string | undefined;

    // Jika role pengguna adalah client/klien, batasi hanya ke data miliknya
    if (user.role === 'client' || user.role === 'klien') {
      const userProfile = await AuthRepository.findById(user.sub);
      clientRestriction = userProfile?.nama || user.username;
    }

    return SampleRepository.findAllSamples(params, clientRestriction);
  }

  /**
   * Ambil detail sampel dengan verifikasi hak akses kepemilikan data
   */
  static async getSampleById(id: number, user: JwtUserPayload) {
    const sample = await SampleRepository.findSampleById(id);
    if (!sample) {
      throw AppError.notFound(`Data sampel dengan ID ${id} tidak ditemukan`, 'SAMPLE_NOT_FOUND');
    }

    // Role klien tidak boleh membuka data sampel klien lain
    if (user.role === 'client' || user.role === 'klien') {
      const userProfile = await AuthRepository.findById(user.sub);
      const userCompany = userProfile?.nama || user.username;
      if (!sample.klien || !sample.klien.toLowerCase().includes(userCompany.toLowerCase())) {
        throw AppError.forbidden(
          'Akses ditolak: Sampel ini bukan milik institusi / perusahaan Anda',
          'CLIENT_SAMPLE_ACCESS_DENIED'
        );
      }
    }

    return sample;
  }

  /**
   * Perbarui status sampel dengan validasi State Machine & RBAC
   */
  static async updateSampleStatus(
    id: number,
    input: UpdateSampleStatusInput,
    user: JwtUserPayload
  ) {
    // 1. Klien dilarang mengubah status sampel apapun
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden(
        'Akses ditolak: Klien tidak memiliki wewenang untuk mengubah status sampel laboratorium',
        'FORBIDDEN_CLIENT_ACTION'
      );
    }

    const sample = await SampleRepository.findSampleById(id);
    if (!sample) {
      throw AppError.notFound(`Data sampel dengan ID ${id} tidak ditemukan`, 'SAMPLE_NOT_FOUND');
    }

    const currentStatus = sample.status as SampleStatus;
    const targetStatus = input.status;

    // Jika status tidak berubah, langsung kembalikan
    if (currentStatus === targetStatus) {
      return sample;
    }

    // 2. Validasi State Machine Status Transisi
    this.validateStatusTransition(currentStatus, targetStatus, user.role);

    // 3. Update status sampel di database
    const updatedSample = await SampleRepository.updateSampleStatus(id, targetStatus);

    // 4. Catat Audit Trail aktivitas
    const logDesc = input.catatan
      ? `STATUS_CHANGED: ${sample.kodeSampel} [${currentStatus} -> ${targetStatus}] - ${input.catatan}`
      : `STATUS_CHANGED: ${sample.kodeSampel} [${currentStatus} -> ${targetStatus}]`;

    await SampleRepository.logActivity({
      userId: user.sub,
      action: logDesc,
      sampleId: id,
    });

    return SampleRepository.findSampleById(id);
  }

  /**
   * Aturan State Machine untuk siklus hidup sampel laboratorium
   */
  private static validateStatusTransition(
    current: SampleStatus,
    target: SampleStatus,
    role: UserRole
  ): void {
    // Sampel yang sudah 'selesai' adalah final (kecuali admin)
    if (current === 'selesai' && role !== 'admin') {
      throw AppError.badRequest(
        `Sampel telah berstatus 'selesai'. Hanya Administrator yang dapat membuka kembali sampel ini.`,
        'TERMINAL_STATUS_LOCKED'
      );
    }

    // Sampel yang sudah 'ditolak' adalah final (kecuali admin atau supervisor)
    if (current === 'ditolak' && role !== 'admin' && role !== 'supervisor') {
      throw AppError.badRequest(
        `Sampel telah berstatus 'ditolak' dan tidak dapat diubah kembali.`,
        'TERMINAL_STATUS_LOCKED'
      );
    }

    // Validasi wewenang peran (Role Authority):
    // 1. Analis TIDAK berwenang menandai sampel selesai atau menolak sepihak
    if (role === 'analis') {
      if (target === 'selesai') {
        throw AppError.forbidden(
          'Akses ditolak: Analis tidak memiliki wewenang approval untuk menandai sampel sebagai "selesai". Persetujuan harus dilakukan oleh Supervisor atau Admin.',
          'APPROVAL_REQUIRES_SUPERVISOR'
        );
      }
      if (target === 'ditolak') {
        throw AppError.forbidden(
          'Akses ditolak: Analis tidak berwenang menolak sampel secara sepihak. Rekomendasi penolakan harus melalui tahap review Supervisor.',
          'REJECTION_REQUIRES_SUPERVISOR'
        );
      }
    }

    // Pemetaan transisi yang diizinkan:
    // antrian -> diuji, ditolak
    // diuji -> review, antrian, ditolak
    // review -> selesai, diuji, ditolak
    // selesai -> diuji (hanya admin untuk re-audit)
    // ditolak -> antrian (hanya supervisor/admin)
    const validTransitions: Record<SampleStatus, SampleStatus[]> = {
      antrian: ['diuji', 'ditolak'],
      diuji: ['review', 'antrian', 'ditolak'],
      review: ['selesai', 'diuji', 'ditolak'],
      selesai: ['diuji', 'review'],
      ditolak: ['antrian', 'review'],
    };

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(target) && role !== 'admin') {
      throw AppError.badRequest(
        `Transisi status dari '${current}' menuju '${target}' tidak diizinkan dalam alur kerja LIMS.`,
        'INVALID_STATUS_TRANSITION'
      );
    }
  }
}
