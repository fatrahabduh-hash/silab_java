import { SampleStatus, ReceiptStatus } from '@prisma/client';

export { SampleStatus, ReceiptStatus };

export interface CreateReceiptInput {
  nomorPenerimaan?: string;
  klien: string;
  tanggalTerima?: Date | string;
  jumlahSampel?: number;
  jenisMaterial?: string;
  metodeUji?: string;
  keterangan?: string;
  samples?: Array<{
    kodeSampel?: string;
    jenisMaterial?: string;
    beratGram?: number;
    klien?: string;
    metodeUji?: string;
    keterangan?: string;
  }>;
}

export interface CreateSampleInput {
  penerimaanId?: number | null;
  kodeSampel?: string;
  tanggalMasuk?: Date | string;
  jenisMaterial: string;
  beratGram?: number;
  klien?: string;
  metodeUji?: string;
  keterangan?: string;
}

export interface UpdateSampleStatusInput {
  status: SampleStatus;
  catatan?: string;
}

export interface UpdateReceiptStatusInput {
  status: ReceiptStatus;
  isConfirmed?: boolean;
}

export interface SampleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: SampleStatus;
  klien?: string;
  metodeUji?: string;
  penerimaanId?: number;
}

export interface ReceiptQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: ReceiptStatus;
  klien?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
