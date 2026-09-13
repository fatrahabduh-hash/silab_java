import { SubmissionRepository } from './submission.repository.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import {
  CreateSubmissionInput,
  UpdateSubmissionStatusInput,
  ConvertSubmissionInput,
  SubmissionFilterQuery,
} from './submission.types.js';

export class SubmissionService {
  private static repository = new SubmissionRepository();

  /**
   * Format output submission & detail
   */
  static enrichSubmission(item: any) {
    return {
      ...item,
      details: item.details
        ? item.details.map((d: any) => ({
            ...d,
            beratGram: d.beratGram ? Number(d.beratGram) : null,
          }))
        : undefined,
    };
  }

  /**
   * Menghasilkan nomor submission otomatis (SSF-YYYYMM-XXXX)
   */
  static async generateSubmissionNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `SSF-${year}${month}-`;

    const lastNomor = await this.repository.findLastNomorForMonth(prefix);
    if (!lastNomor) {
      return `${prefix}0001`;
    }

    const parts = lastNomor.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10) || 0;
    const nextSeq = String(lastSeq + 1).padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }

  /**
   * Daftar pengajuan permohonan sampel
   */
  static async getSubmissionList(query: SubmissionFilterQuery, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      query.klien = user.username;
    }

    const [items, total] = await Promise.all([
      this.repository.findMany(query),
      this.repository.count(query),
    ]);

    const enriched = items.map((i) => this.enrichSubmission(i));
    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Detail pengajuan sampel
   */
  static async getSubmissionById(id: number, user: JwtUserPayload) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Permohonan sampel dengan ID ${id} tidak ditemukan`, 'SUBMISSION_NOT_FOUND');
    }

    if ((user.role === 'client' || user.role === 'klien') && item.klien.toLowerCase() !== user.username.toLowerCase()) {
      throw AppError.forbidden('Akses ditolak: Anda tidak memiliki akses ke permohonan klien lain', 'FORBIDDEN_CLIENT_SUBMISSION');
    }

    return this.enrichSubmission(item);
  }

  /**
   * Statistik permohonan sampel
   */
  static async getStats() {
    return this.repository.getStats();
  }

  /**
   * Submit formulir permohonan sampel baru (SSF)
   */
  static async createSubmission(input: CreateSubmissionInput, user: JwtUserPayload) {
    const nomorSubmission = input.nomorSubmission || (await this.generateSubmissionNumber());

    const existing = await this.repository.findByNomor(nomorSubmission);
    if (existing) {
      throw AppError.conflict(`Nomor submission '${nomorSubmission}' sudah digunakan`, 'DUPLICATE_NOMOR_SUBMISSION');
    }

    const submissionData = {
      nomorSubmission,
      klien: input.klien,
      kontakPerson: input.kontakPerson || null,
      email: input.email,
      telepon: input.telepon || null,
      alamat: input.alamat || null,
      poReferensi: input.poReferensi || null,
      instruksiKhusus: input.instruksiKhusus || null,
      catatan: input.catatan || null,
      status: 'pending' as const,
    };

    const detailsData = input.samples.map((s) => ({
      jenisMaterial: s.jenisMaterial,
      beratGram: s.beratGram ?? null,
      metodeUji: s.metodeUji || null,
      parameter: s.parameter || null,
      keterangan: s.keterangan || null,
    }));

    const created = await this.repository.create(submissionData, detailsData);

    // Otomatis buat entri client_access untuk tracking transparan
    const kodeAkses = nomorSubmission;
    await prisma.clientAccess.upsert({
      where: { kodeAkses },
      update: {
        submissionId: created.id,
        klien: created.klien,
        email: created.email,
        status: 'aktif',
      },
      create: {
        penggunaId: user.sub,
        submissionId: created.id,
        kodeAkses,
        klien: created.klien,
        email: created.email,
        status: 'aktif',
      },
    });

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Permohonan sampel baru diajukan: ${created.nomorSubmission} oleh ${created.klien} (${detailsData.length} sampel)`,
        modul: 'SUBMISSION',
      },
    });

    return {
      ...this.enrichSubmission(created),
      kodeAkses,
    };
  }

  /**
   * Petugas memverifikasi status permohonan sampel (diterima, diproses, ditolak)
   */
  static async updateStatus(id: number, input: UpdateSubmissionStatusInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden('Akses ditolak: Klien tidak dapat mengubah status verifikasi submission', 'FORBIDDEN_STATUS_UPDATE');
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Permohonan sampel dengan ID ${id} tidak ditemukan`, 'SUBMISSION_NOT_FOUND');
    }

    const updated = await this.repository.updateStatus(id, input.status, input.catatan);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Verifikasi submission ${item.nomorSubmission}: status diubah dari '${item.status}' menjadi '${input.status}'`,
        modul: 'SUBMISSION',
      },
    });

    return this.enrichSubmission(updated);
  }

  /**
   * Konversi permohonan yang disetujui menjadi Batch Penerimaan Sampel (SampleReceipt & Sample)
   */
  static async convertToSampleReceipt(id: number, input: ConvertSubmissionInput, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden('Hanya Admin atau Supervisor yang dapat mengonversi submission menjadi batch penerimaan resmi', 'FORBIDDEN_CONVERT_SUBMISSION');
    }

    const submission = await this.repository.findById(id);
    if (!submission) {
      throw AppError.notFound(`Permohonan sampel dengan ID ${id} tidak ditemukan`, 'SUBMISSION_NOT_FOUND');
    }

    if (submission.status === 'ditolak') {
      throw AppError.badRequest('Permohonan yang telah DITOLAK tidak dapat dikonversi menjadi penerimaan sampel', 'CANNOT_CONVERT_REJECTED');
    }

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `REC-${year}${month}-`;

    // Ambil nomor penerimaan
    let nomorPenerimaan = input.nomorPenerimaan;
    if (!nomorPenerimaan) {
      const lastReceipt = await prisma.sampleReceipt.findFirst({
        where: { nomorPenerimaan: { startsWith: prefix } },
        orderBy: { id: 'desc' },
      });
      const lastSeq = lastReceipt ? parseInt(lastReceipt.nomorPenerimaan.split('-')[2], 10) || 0 : 0;
      nomorPenerimaan = `${prefix}${String(lastSeq + 1).padStart(4, '0')}`;
    }

    // Buat Batch Penerimaan Sampel dan rincian Sampel via transaksi Prisma
    const result = await prisma.$transaction(async (tx) => {
      // 1. Buat SampleReceipt
      const receipt = await tx.sampleReceipt.create({
        data: {
          nomorPenerimaan: nomorPenerimaan!,
          klien: submission.klien,
          tanggalTerima: now,
          jumlahSampel: submission.details.length,
          jenisMaterial: submission.details[0]?.jenisMaterial || 'Mineral Sample',
          metodeUji: submission.details[0]?.metodeUji || 'XRF Analysis',
          keterangan: `Dikonversi dari SSF ${submission.nomorSubmission}.${input.catatan ? ` ${input.catatan}` : ''}`,
          status: 'diterima',
          isConfirmed: true,
          dibuatOleh: user.sub,
        },
      });

      // 2. Buat record Sample untuk setiap detail
      const samplePrefix = `SMP-${year}${month}-`;
      const lastSample = await tx.sample.findFirst({
        where: { kodeSampel: { startsWith: samplePrefix } },
        orderBy: { id: 'desc' },
      });
      let sampleSeq = lastSample ? parseInt(lastSample.kodeSampel.split('-')[2], 10) || 0 : 0;

      const createdSamples = [];
      for (const d of submission.details) {
        sampleSeq++;
        const kodeSampel = `${samplePrefix}${String(sampleSeq).padStart(4, '0')}`;

        const sample = await tx.sample.create({
          data: {
            penerimaanId: receipt.id,
            kodeSampel,
            tanggalMasuk: now,
            jenisMaterial: d.jenisMaterial,
            beratGram: d.beratGram ? Number(d.beratGram) : null,
            klien: submission.klien,
            metodeUji: d.metodeUji || null,
            keterangan: d.keterangan || `Dari item submission #${d.id}`,
            status: 'antrian',
            dibuatOleh: user.sub,
          },
        });
        createdSamples.push(sample);
      }

      // 3. Update status submission menjadi 'diproses'
      await tx.sampleSubmission.update({
        where: { id },
        data: {
          status: 'diproses',
        },
      });

      // 4. Update client access yang terhubung
      await tx.clientAccess.updateMany({
        where: { submissionId: id },
        data: {
          penerimaanId: receipt.id,
          status: 'aktif',
        },
      });

      return { receipt, samples: createdSamples };
    });

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Konversi submission ${submission.nomorSubmission} menjadi Penerimaan Sampel ${result.receipt.nomorPenerimaan} (${result.samples.length} sampel)`,
        modul: 'SUBMISSION',
      },
    });

    return {
      submissionId: id,
      nomorSubmission: submission.nomorSubmission,
      receiptId: result.receipt.id,
      nomorPenerimaan: result.receipt.nomorPenerimaan,
      totalSampelDikonversi: result.samples.length,
      samples: result.samples,
    };
  }

  /**
   * Hapus submission (Hanya jika status masih 'pending' atau 'ditolak')
   */
  static async deleteSubmission(id: number, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden('Hanya Admin atau Supervisor yang berhak menghapus permohonan sampel', 'FORBIDDEN_SUBMISSION_DELETE');
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Permohonan sampel dengan ID ${id} tidak ditemukan`, 'SUBMISSION_NOT_FOUND');
    }

    if (item.status === 'diproses' || item.status === 'diterima') {
      throw AppError.badRequest(
        `Permohonan ${item.nomorSubmission} telah diverifikasi/diterima ke laboratorium dan tidak dapat dihapus`,
        'CANNOT_DELETE_ACTIVE_SUBMISSION'
      );
    }

    await prisma.clientAccess.deleteMany({
      where: { submissionId: id },
    });

    await this.repository.delete(id);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Hapus submission: ${item.nomorSubmission} (${item.klien})`,
        modul: 'SUBMISSION',
      },
    });

    return { id, nomorSubmission: item.nomorSubmission, deleted: true };
  }
}
