export interface CreateReagentInput {
  kodeBahan: string;
  nama: string;
  stok?: number;
  satuan?: string;
  stokMinimum?: number;
  supplier?: string;
  tanggalKadaluarsa?: string;
}

export interface UpdateReagentInput {
  nama?: string;
  satuan?: string;
  stokMinimum?: number;
  supplier?: string;
  tanggalKadaluarsa?: string | null;
}

export type StockAdjustType = 'masuk' | 'keluar' | 'opname';

export interface StockAdjustInput {
  jenis: StockAdjustType;
  jumlah: number;
  keterangan?: string;
}

export interface ReagentFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  statusStok?: 'kritis' | 'aman';
  statusKadaluarsa?: 'kadaluarsa' | 'segera' | 'aman';
}

export interface ReagentStats {
  totalItem: number;
  stokKritis: number; // stok <= stokMinimum
  stokAman: number;
  kadaluarsa: number; // tanggalKadaluarsa < today
  kadaluarsaSegera: number; // dalam 30 hari
}
