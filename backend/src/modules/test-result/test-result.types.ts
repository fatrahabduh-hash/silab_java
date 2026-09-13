import { TestConclusion } from '@prisma/client';

export { TestConclusion };

export interface CreateTestResultInput {
  kodeUji?: string;
  sampelId: number;
  noReferensi?: string;
  preparasiId?: number;
  parameter: string;
  nilai: number;
  faktorPengenceran?: number;
  satuan?: string;
  faktorKonversi?: number;
  batasMin?: number;
  batasMaks?: number;
  metode?: string;
  alatId?: number;
  analisId?: number;
  kesimpulan?: TestConclusion;
  catatan?: string;
  tanggalUji?: string;
}

export interface BatchTestResultRow {
  sampelId: number;
  parameter: string;
  nilai: number;
  satuan?: string;
  metode?: string;
  preparasiId?: number;
  faktorPengenceran?: number;
  faktorKonversi?: number;
  batasMin?: number;
  batasMaks?: number;
  kesimpulan?: TestConclusion;
  noReferensi?: string;
  catatan?: string;
}

export interface CreateBatchTestResultInput {
  rows: BatchTestResultRow[];
  analisId?: number;
  alatId?: number;
  tanggalUji?: string;
  metode?: string;
  satuan?: string;
}

export interface UpdateTestResultInput {
  parameter?: string;
  nilai?: number;
  faktorPengenceran?: number;
  faktorKonversi?: number;
  batasMin?: number;
  batasMaks?: number;
  satuan?: string;
  metode?: string;
  alatId?: number;
  analisId?: number;
  kesimpulan?: TestConclusion;
  catatan?: string;
  tanggalUji?: string;
}

export interface TestResultQueryFilter {
  page?: number;
  limit?: number;
  sampelId?: number;
  penerimaanId?: number;
  kodeUji?: string;
  parameter?: string;
  kesimpulan?: TestConclusion;
  metode?: string;
  analisId?: number;
  alatId?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
