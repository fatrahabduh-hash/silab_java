export interface CreateTariffInput {
  nama: string;
  metode?: string;
  parameter?: string;
  harga: number;
  satuan?: string;
  aktif?: boolean;
}

export interface UpdateTariffInput {
  nama?: string;
  metode?: string;
  parameter?: string;
  harga?: number;
  satuan?: string;
  aktif?: boolean;
}

export interface TariffFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  parameter?: string;
  metode?: string;
  aktif?: boolean;
}
