import { InvoiceStatus } from '@prisma/client';

export { InvoiceStatus };

export interface CreateInvoiceItemInput {
  deskripsi: string;
  sampelId?: number;
  tarifId?: number;
  qty: number;
  hargaSatuan: number;
  catatan?: string;
}

export interface CreateInvoiceInput {
  nomorInvoice?: string;
  penerimaanId?: number;
  klien: string;
  alamatKlien?: string;
  tanggalInvoice?: string;
  tanggalJatuhTempo?: string;
  diskonPct?: number;
  ppnPct?: number;
  status?: InvoiceStatus;
  catatan?: string;
  items: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceInput {
  alamatKlien?: string;
  tanggalInvoice?: string;
  tanggalJatuhTempo?: string;
  diskonPct?: number;
  ppnPct?: number;
  catatan?: string;
  items?: CreateInvoiceItemInput[];
}

export interface UpdateInvoiceStatusInput {
  status: InvoiceStatus;
  catatan?: string;
}

export interface InvoiceFilterQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: InvoiceStatus;
  klien?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface InvoiceStats {
  totalInvoice: number;
  totalNominal: number;
  totalLunasNominal: number;
  totalPiutangNominal: number;
  statusCount: {
    draft: number;
    diterbitkan: number;
    lunas: number;
    dibatalkan: number;
  };
}
