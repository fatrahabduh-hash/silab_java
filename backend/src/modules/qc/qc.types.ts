import { QcType, QcFlag, QcStatus } from '@prisma/client';

export { QcType, QcFlag, QcStatus };

export interface CreateQcInput {
  preparasiId?: number;
  sampelId: number;
  tipeQc: QcType;
  parameter?: string;
  nilaiQc?: number;
  nilaiExpected?: number;
  satuan?: string;
  batasMinPct?: number;
  batasMaksPct?: number;
  tanggalUji?: string;
}

export interface CreateStandardSampleInput {
  sampelKey: string;
  nilaiSertifikat: number;
  parameter: string;
}

export interface ReviewQcInput {
  keputusan: 'disetujui' | 'ditolak';
  catatanReview?: string;
}

export interface QcQueryFilter {
  page?: number;
  limit?: number;
  sampelId?: number;
  tipeQc?: QcType;
  flag?: QcFlag;
  statusQc?: QcStatus;
  parameter?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface QcStatistics {
  total: number;
  pass: number;
  warning: number;
  fail: number;
  pending: number;
  disetujui: number;
  ditolak: number;
  byType: {
    blanko: number;
    standar: number;
    spike: number;
    duplikat: number;
  };
}
