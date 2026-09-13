import { PreparationMethod } from '@prisma/client';

export { PreparationMethod };

export interface ReagentUsageItem {
  bahanId: number;
  jumlah: number; // Pemakaian per sampel
  satuan?: string;
  lot?: string;
  nama?: string;
  kode?: string;
}

export interface CreatePreparationInput {
  modeInput?: 'single' | 'wo';
  workOrderId?: number;
  sampelId?: number;
  sampelIds?: number[];
  metodePreparasi: PreparationMethod;
  prosedur?: string;
  faktorPengenceran?: number;
  volumeAwalMl?: number;
  volumeAkhirMl?: number;
  reagen?: ReagentUsageItem[];
  blankoDisiapkan?: boolean;
  standarDisiapkan?: boolean;
  spikeDisiapkan?: boolean;
  duplikatDisiapkan?: boolean;
  suhuRuang?: number;
  kelembaban?: number;
  catatan?: string;
  analisId?: number;
  tanggalPreparasi?: string;
}

export interface UpdatePreparationInput {
  prosedur?: string;
  faktorPengenceran?: number;
  volumeAwalMl?: number;
  volumeAkhirMl?: number;
  blankoDisiapkan?: boolean;
  standarDisiapkan?: boolean;
  spikeDisiapkan?: boolean;
  duplikatDisiapkan?: boolean;
  suhuRuang?: number;
  kelembaban?: number;
  catatan?: string;
  analisId?: number;
  tanggalPreparasi?: string;
}

export interface PreparationQueryFilter {
  page?: number;
  limit?: number;
  workOrderId?: number;
  sampelId?: number;
  metodePreparasi?: PreparationMethod;
  analisId?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}
