import { SubmissionStatus } from '@prisma/client';

export { SubmissionStatus };

export interface CreateSubmissionDetailInput {
  jenisMaterial: string;
  beratGram?: number;
  metodeUji?: string;
  parameter?: string;
  keterangan?: string;
}

export interface CreateSubmissionInput {
  nomorSubmission?: string;
  klien: string;
  kontakPerson?: string;
  email: string;
  telepon?: string;
  alamat?: string;
  poReferensi?: string;
  instruksiKhusus?: string;
  catatan?: string;
  samples: CreateSubmissionDetailInput[];
}

export interface UpdateSubmissionStatusInput {
  status: SubmissionStatus;
  catatan?: string;
}

export interface ConvertSubmissionInput {
  nomorPenerimaan?: string;
  catatan?: string;
}

export interface SubmissionFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: SubmissionStatus;
  klien?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SubmissionStats {
  total: number;
  pending: number;
  diterima: number;
  diproses: number;
  ditolak: number;
}
