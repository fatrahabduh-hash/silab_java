import { EquipmentStatus } from '@prisma/client';

export { EquipmentStatus };

export interface CreateEquipmentInput {
  kodeAlat: string;
  nama: string;
  lokasi?: string;
  status?: EquipmentStatus;
  tanggalKalibrasi?: string;
  masaBerlakuKalibrasi?: string;
  jamPakai?: number;
  jadwalMaintenance?: string;
  pic?: string;
  catatan?: string;
}

export interface UpdateEquipmentInput {
  nama?: string;
  lokasi?: string;
  status?: EquipmentStatus;
  tanggalKalibrasi?: string | null;
  masaBerlakuKalibrasi?: string | null;
  jamPakai?: number;
  jadwalMaintenance?: string | null;
  pic?: string;
  catatan?: string;
}

export interface LogUsageInput {
  tambahanJam: number;
  catatan?: string;
}

export interface EquipmentFilterQuery {
  page?: number;
  limit?: number;
  status?: EquipmentStatus;
  search?: string;
  lokasi?: string;
  kalibrasiStatus?: 'kadaluarsa' | 'segera' | 'valid';
}

export interface EquipmentStats {
  total: number;
  tersedia: number;
  digunakan: number;
  maintenance: number;
  rusak: number;
  kalibrasiKadaluarsa: number;
  kalibrasiSegera: number; // < 30 hari
}
