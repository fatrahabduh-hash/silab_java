import { prisma } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import {
  SampleLifecycleStage,
  SampleProgressItem,
  ClientTrackResult,
} from './client-portal.types.js';

export class ClientPortalService {
  /**
   * Menghitung tahapan dan progres numerik sampel secara dinamis
   */
  private static calculateSampleProgress(sample: any): SampleProgressItem {
    const hasWorkOrder = (sample.workOrderSamples?.length ?? 0) > 0;
    const hasPreparation = (sample.preparations?.length ?? 0) > 0;
    const hasTestResult = (sample.testResults?.length ?? 0) > 0;
    const hasQc = (sample.qcSamples?.length ?? 0) > 0;

    let currentStage: SampleLifecycleStage = 'PENERIMAAN';
    let progressPct = 20;

    if (sample.status === 'selesai') {
      currentStage = 'SELESAI';
      progressPct = 100;
    } else if (hasQc) {
      currentStage = 'QUALITY_CONTROL';
      progressPct = 90;
    } else if (hasTestResult) {
      currentStage = 'PENGUJIAN';
      progressPct = 75;
    } else if (hasPreparation) {
      currentStage = 'PREPARASI';
      progressPct = 50;
    } else if (hasWorkOrder) {
      currentStage = 'WORK_ORDER';
      progressPct = 35;
    }

    return {
      id: sample.id,
      kodeSampel: sample.kodeSampel,
      jenisMaterial: sample.jenisMaterial,
      status: sample.status || 'antrian',
      currentStage,
      progressPct,
      hasWorkOrder,
      hasPreparation,
      hasTestResult,
      hasQc,
      resultsCount: sample.testResults?.length ?? 0,
    };
  }

  /**
   * Lacak progres pengujian secara publik / transparan menggunakan kode akses atau nomor SSF
   */
  static async trackByAccessCode(kodeAkses: string): Promise<ClientTrackResult> {
    const access = await prisma.clientAccess.findFirst({
      where: {
        OR: [
          { kodeAkses },
          { submission: { nomorSubmission: kodeAkses } },
        ],
      },
      include: {
        submission: {
          include: {
            details: true,
          },
        },
        receipt: {
          include: {
            samples: {
              include: {
                workOrderSamples: true,
                preparations: true,
                testResults: true,
                qcSamples: true,
              },
            },
          },
        },
      },
    });

    if (!access) {
      // Coba cari langsung ke submission jika kode akses identik dengan nomor SSF
      const directSub = await prisma.sampleSubmission.findUnique({
        where: { nomorSubmission: kodeAkses },
        include: {
          details: true,
          clientAccesses: {
            include: {
              receipt: {
                include: {
                  samples: {
                    include: {
                      workOrderSamples: true,
                      preparations: true,
                      testResults: true,
                      qcSamples: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!directSub) {
        throw AppError.notFound(
          `Kode pelacakan '${kodeAkses}' tidak ditemukan di sistem LIMS`,
          'TRACK_CODE_NOT_FOUND'
        );
      }

      const receipt = directSub.clientAccesses[0]?.receipt || null;
      const samples: SampleProgressItem[] = receipt
        ? receipt.samples.map((s) => this.calculateSampleProgress(s))
        : [];

      const overallProgress = samples.length > 0
        ? Math.round(samples.reduce((acc, s) => acc + s.progressPct, 0) / samples.length)
        : directSub.status === 'pending' ? 10 : 25;

      return {
        kodeAkses,
        klien: directSub.klien,
        submission: {
          id: directSub.id,
          nomorSubmission: directSub.nomorSubmission,
          tanggalSubmit: directSub.tanggalSubmit,
          status: directSub.status || 'pending',
          totalItemSampel: directSub.details.length,
        },
        receipt: receipt ? {
          id: receipt.id,
          nomorPenerimaan: receipt.nomorPenerimaan,
          tanggalTerima: receipt.tanggalTerima,
          jumlahSampel: receipt.jumlahSampel ?? 0,
          status: receipt.status || 'diproses',
        } : null,
        samples,
        overallStatus: directSub.status || 'pending',
        overallProgress,
      };
    }

    const receipt = access.receipt;
    const samples: SampleProgressItem[] = receipt
      ? receipt.samples.map((s) => this.calculateSampleProgress(s))
      : [];

    const overallProgress = samples.length > 0
      ? Math.round(samples.reduce((acc, s) => acc + s.progressPct, 0) / samples.length)
      : access.submission?.status === 'pending' ? 10 : 25;

    const overallStatus = receipt
      ? (receipt.status || 'diproses')
      : (access.submission?.status || access.status || 'pending');

    return {
      kodeAkses,
      klien: access.klien,
      submission: access.submission ? {
        id: access.submission.id,
        nomorSubmission: access.submission.nomorSubmission,
        tanggalSubmit: access.submission.tanggalSubmit,
        status: access.submission.status || 'pending',
        totalItemSampel: access.submission.details.length,
      } : null,
      receipt: receipt ? {
        id: receipt.id,
        nomorPenerimaan: receipt.nomorPenerimaan,
        tanggalTerima: receipt.tanggalTerima,
        jumlahSampel: receipt.jumlahSampel ?? 0,
        status: receipt.status || 'diproses',
      } : null,
      samples,
      overallStatus,
      overallProgress,
    };
  }

  /**
   * Ambil seluruh riwayat permohonan pengujian milik akun klien yang sedang login
   */
  static async getMySubmissions(user: JwtUserPayload) {
    const submissions = await prisma.sampleSubmission.findMany({
      where: {
        OR: [
          { klien: user.username },
          { clientAccesses: { some: { penggunaId: user.sub } } },
        ],
      },
      include: {
        details: true,
      },
      orderBy: { id: 'desc' },
    });

    return submissions;
  }

  /**
   * Ambil status real-time seluruh sampel uji milik akun klien
   */
  static async getMySamples(user: JwtUserPayload) {
    const samples = await prisma.sample.findMany({
      where: {
        OR: [
          { klien: user.username },
          { receipt: { clientAccesses: { some: { penggunaId: user.sub } } } },
        ],
      },
      include: {
        receipt: {
          select: {
            nomorPenerimaan: true,
            tanggalTerima: true,
          },
        },
        workOrderSamples: true,
        preparations: true,
        testResults: {
          select: {
            id: true,
            parameter: true,
            nilai: true,
            satuan: true,
            kesimpulan: true,
          },
        },
        qcSamples: true,
      },
      orderBy: { id: 'desc' },
    });

    return samples.map((s) => ({
      ...this.calculateSampleProgress(s),
      nomorPenerimaan: s.receipt?.nomorPenerimaan || null,
      tanggalTerima: s.receipt?.tanggalTerima || null,
      testResults: s.testResults.map((tr) => ({
        ...tr,
        nilai: Number(tr.nilai),
      })),
    }));
  }

  /**
   * Admin / Supervisor mengambil daftar seluruh kunci akses klien
   */
  static async getAccessKeys() {
    return prisma.clientAccess.findMany({
      include: {
        user: {
          select: {
            id: true,
            nama: true,
            username: true,
            email: true,
          },
        },
        submission: {
          select: {
            id: true,
            nomorSubmission: true,
            status: true,
          },
        },
        receipt: {
          select: {
            id: true,
            nomorPenerimaan: true,
            status: true,
          },
        },
      },
      orderBy: { id: 'desc' },
    });
  }
}
