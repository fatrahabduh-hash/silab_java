import { InvoiceRepository } from './invoice.repository.js';
import { prisma } from '../../config/database.js';
import { AppError } from '../../common/errors/app-error.js';
import { JwtUserPayload } from '../auth/auth.types.js';
import {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  UpdateInvoiceStatusInput,
  InvoiceFilterQuery,
  InvoiceStatus,
} from './invoice.types.js';

export class InvoiceService {
  private static repository = new InvoiceRepository();

  /**
   * Mengonversi Decimal Prisma ke number untuk output API
   */
  static enrichInvoice(item: any) {
    return {
      ...item,
      subtotal: Number(item.subtotal ?? 0),
      diskonPct: Number(item.diskonPct ?? 0),
      diskonNominal: Number(item.diskonNominal ?? 0),
      ppnPct: Number(item.ppnPct ?? 0),
      ppnNominal: Number(item.ppnNominal ?? 0),
      total: Number(item.total ?? 0),
      items: item.items
        ? item.items.map((it: any) => ({
            ...it,
            hargaSatuan: Number(it.hargaSatuan ?? 0),
            subtotal: Number(it.subtotal ?? 0),
          }))
        : undefined,
    };
  }

  /**
   * Menghasilkan nomor invoice otomatis (INV-YYYYMM-XXXX)
   */
  static async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `INV-${year}${month}-`;

    const lastNomor = await this.repository.findLastNomorForMonth(prefix);
    if (!lastNomor) {
      return `${prefix}0001`;
    }

    const parts = lastNomor.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10) || 0;
    const nextSeq = String(lastSeq + 1).padStart(4, '0');
    return `${prefix}${nextSeq}`;
  }

  /**
   * Helper kalkulasi matematis finansial invoice
   */
  static calculateAmounts(items: Array<{ qty: number; hargaSatuan: number }>, diskonPct = 0, ppnPct = 11) {
    let subtotal = 0;
    const calculatedItems = items.map((it) => {
      const itemSubtotal = it.qty * it.hargaSatuan;
      subtotal += itemSubtotal;
      return {
        ...it,
        subtotal: itemSubtotal,
      };
    });

    const diskonNominal = Math.round((subtotal * diskonPct) / 100);
    const dpp = Math.max(0, subtotal - diskonNominal);
    const ppnNominal = Math.round((dpp * ppnPct) / 100);
    const total = dpp + ppnNominal;

    return {
      subtotal,
      diskonNominal,
      ppnNominal,
      total,
      calculatedItems,
    };
  }

  /**
   * Mendapatkan daftar invoice dengan filter & pagination
   */
  static async getInvoiceList(query: InvoiceFilterQuery, user: JwtUserPayload) {
    // Klien hanya dapat melihat tagihan miliknya sendiri
    if (user.role === 'client' || user.role === 'klien') {
      query.klien = user.username;
    }

    const [items, total] = await Promise.all([
      this.repository.findMany(query),
      this.repository.count(query),
    ]);

    const enriched = items.map((inv) => this.enrichInvoice(inv));
    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      data: enriched,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mendapatkan detail spesifik invoice
   */
  static async getInvoiceById(id: number, user: JwtUserPayload) {
    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Invoice dengan ID ${id} tidak ditemukan`, 'INVOICE_NOT_FOUND');
    }

    if ((user.role === 'client' || user.role === 'klien') && item.klien.toLowerCase() !== user.username.toLowerCase()) {
      throw AppError.forbidden('Akses ditolak: Anda tidak memiliki akses ke tagihan klien lain', 'FORBIDDEN_CLIENT_INVOICE');
    }

    return this.enrichInvoice(item);
  }

  /**
   * Ringkasan statistik invoice & pendapatan
   */
  static async getStats() {
    return this.repository.getStats();
  }

  /**
   * Pembuatan invoice baru
   */
  static async createInvoice(input: CreateInvoiceInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden('Akses ditolak: Klien tidak dapat menerbitkan tagihan invoice', 'FORBIDDEN_INVOICE_CREATE');
    }

    const nomorInvoice = input.nomorInvoice || (await this.generateInvoiceNumber());

    // Cek duplikasi nomor
    const existing = await this.repository.findByNomor(nomorInvoice);
    if (existing) {
      throw AppError.conflict(`Nomor invoice '${nomorInvoice}' sudah terdaftar`, 'DUPLICATE_NOMOR_INVOICE');
    }

    // Cek penerimaan sampel jika disediakan
    if (input.penerimaanId) {
      const receipt = await prisma.sampleReceipt.findUnique({
        where: { id: input.penerimaanId },
      });
      if (!receipt) {
        throw AppError.notFound(`Penerimaan sampel ID ${input.penerimaanId} tidak ditemukan`, 'RECEIPT_NOT_FOUND');
      }
    }

    const { subtotal, diskonNominal, ppnNominal, total, calculatedItems } = this.calculateAmounts(
      input.items,
      input.diskonPct ?? 0,
      input.ppnPct ?? 11
    );

    const invoiceData = {
      nomorInvoice,
      penerimaanId: input.penerimaanId || null,
      klien: input.klien,
      alamatKlien: input.alamatKlien || null,
      tanggalInvoice: input.tanggalInvoice ? new Date(input.tanggalInvoice) : new Date(),
      tanggalJatuhTempo: input.tanggalJatuhTempo ? new Date(input.tanggalJatuhTempo) : null,
      diskonPct: input.diskonPct ?? 0,
      diskonNominal,
      ppnPct: input.ppnPct ?? 11,
      ppnNominal,
      subtotal,
      total,
      status: input.status || 'draft',
      catatan: input.catatan || null,
      dibuatOleh: user.sub,
    };

    const itemsData = input.items.map((it, idx) => ({
      deskripsi: it.deskripsi,
      sampelId: it.sampelId || null,
      tarifId: it.tarifId || null,
      qty: it.qty,
      hargaSatuan: it.hargaSatuan,
      subtotal: calculatedItems[idx].subtotal,
      catatan: it.catatan || null,
    }));

    const created = await this.repository.create(invoiceData, itemsData);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Terbitkan invoice ${created.nomorInvoice} untuk ${created.klien} (Total: Rp ${total.toLocaleString('id-ID')})`,
        modul: 'INVOICE',
      },
    });

    return this.enrichInvoice(created);
  }

  /**
   * Update invoice (Hanya boleh jika status masih 'draft')
   */
  static async updateInvoice(id: number, input: UpdateInvoiceInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden('Akses ditolak: Klien tidak dapat mengubah invoice', 'FORBIDDEN_INVOICE_UPDATE');
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Invoice dengan ID ${id} tidak ditemukan`, 'INVOICE_NOT_FOUND');
    }

    if (item.status === 'lunas') {
      throw AppError.badRequest('Invoice yang telah berstatus LUNAS tidak dapat diubah kembali demi integritas audit keuangan', 'INVOICE_ALREADY_PAID');
    }

    if (item.status === 'dibatalkan') {
      throw AppError.badRequest('Invoice yang telah DIBATALKAN tidak dapat diedit', 'INVOICE_CANCELLED');
    }

    let itemsToProcess = input.items;
    let itemsData: any = undefined;
    let newSubtotal = Number(item.subtotal ?? 0);
    let newDiskonNominal = Number(item.diskonNominal ?? 0);
    let newPpnNominal = Number(item.ppnNominal ?? 0);
    let newTotal = Number(item.total ?? 0);

    const diskonPct = input.diskonPct !== undefined ? input.diskonPct : Number(item.diskonPct ?? 0);
    const ppnPct = input.ppnPct !== undefined ? input.ppnPct : Number(item.ppnPct ?? 11);

    if (itemsToProcess && itemsToProcess.length > 0) {
      const calc = this.calculateAmounts(itemsToProcess, diskonPct, ppnPct);
      newSubtotal = calc.subtotal;
      newDiskonNominal = calc.diskonNominal;
      newPpnNominal = calc.ppnNominal;
      newTotal = calc.total;

      itemsData = itemsToProcess.map((it, idx) => ({
        deskripsi: it.deskripsi,
        sampelId: it.sampelId || null,
        tarifId: it.tarifId || null,
        qty: it.qty,
        hargaSatuan: it.hargaSatuan,
        subtotal: calc.calculatedItems[idx].subtotal,
        catatan: it.catatan || null,
      }));
    } else if (input.diskonPct !== undefined || input.ppnPct !== undefined) {
      // Hitung ulang dengan item existing
      const existingItems = item.items.map((it) => ({
        qty: it.qty ?? 1,
        hargaSatuan: Number(it.hargaSatuan ?? 0),
      }));
      const calc = this.calculateAmounts(existingItems, diskonPct, ppnPct);
      newSubtotal = calc.subtotal;
      newDiskonNominal = calc.diskonNominal;
      newPpnNominal = calc.ppnNominal;
      newTotal = calc.total;
    }

    const headerData: any = {
      subtotal: newSubtotal,
      diskonPct,
      diskonNominal: newDiskonNominal,
      ppnPct,
      ppnNominal: newPpnNominal,
      total: newTotal,
    };

    if (input.alamatKlien !== undefined) headerData.alamatKlien = input.alamatKlien;
    if (input.tanggalInvoice) headerData.tanggalInvoice = new Date(input.tanggalInvoice);
    if (input.tanggalJatuhTempo !== undefined) {
      headerData.tanggalJatuhTempo = input.tanggalJatuhTempo ? new Date(input.tanggalJatuhTempo) : null;
    }
    if (input.catatan !== undefined) headerData.catatan = input.catatan;

    const updated = await this.repository.update(id, headerData, itemsData);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Perbarui invoice ${item.nomorInvoice} (Total baru: Rp ${newTotal.toLocaleString('id-ID')})`,
        modul: 'INVOICE',
      },
    });

    return this.enrichInvoice(updated);
  }

  /**
   * Perbarui status invoice (draft -> diterbitkan -> lunas / dibatalkan)
   */
  static async updateStatus(id: number, input: UpdateInvoiceStatusInput, user: JwtUserPayload) {
    if (user.role === 'client' || user.role === 'klien') {
      throw AppError.forbidden('Akses ditolak: Klien tidak dapat mengubah status pembayaran invoice', 'FORBIDDEN_STATUS_UPDATE');
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Invoice dengan ID ${id} tidak ditemukan`, 'INVOICE_NOT_FOUND');
    }

    if (item.status === 'lunas' && input.status !== 'lunas') {
      if (user.role !== 'admin') {
        throw AppError.badRequest('Hanya Admin yang berwenang mengubah status invoice yang telah lunas', 'FORBIDDEN_PAID_STATUS_REVERT');
      }
    }

    const updated = await this.repository.updateStatus(id, input.status, input.catatan || undefined);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Ubah status invoice ${item.nomorInvoice} dari '${item.status}' menjadi '${input.status}'`,
        modul: 'INVOICE',
      },
    });

    return this.enrichInvoice(updated);
  }

  /**
   * Hapus invoice (Khusus status 'draft' atau 'dibatalkan', Admin/Supervisor only)
   */
  static async deleteInvoice(id: number, user: JwtUserPayload) {
    if (user.role !== 'admin' && user.role !== 'supervisor') {
      throw AppError.forbidden('Hanya Admin atau Supervisor yang berhak menghapus invoice', 'FORBIDDEN_INVOICE_DELETE');
    }

    const item = await this.repository.findById(id);
    if (!item) {
      throw AppError.notFound(`Invoice dengan ID ${id} tidak ditemukan`, 'INVOICE_NOT_FOUND');
    }

    if (item.status === 'lunas') {
      throw AppError.badRequest('Invoice berstatus LUNAS tidak dapat dihapus dari database', 'CANNOT_DELETE_PAID_INVOICE');
    }

    await this.repository.delete(id);

    await prisma.activityLog.create({
      data: {
        penggunaId: user.sub,
        aksi: `Hapus invoice ${item.nomorInvoice} (${item.klien})`,
        modul: 'INVOICE',
      },
    });

    return { id, nomorInvoice: item.nomorInvoice, deleted: true };
  }
}
