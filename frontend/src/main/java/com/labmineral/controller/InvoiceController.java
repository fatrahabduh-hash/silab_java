package com.labmineral.controller;

import com.labmineral.dto.request.CreateInvoiceRequestDTO;
import com.labmineral.dto.request.InvoiceItemRequestDTO;
import com.labmineral.dto.response.InvoiceResponseDTO;
import com.labmineral.dto.response.InvoiceStatsDTO;
import com.labmineral.dto.response.SampleReceiptResponseDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.InvoiceService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.ArrayList;
import java.util.List;

@Controller
@RequestMapping("/invoice")
public class InvoiceController {

    private static final Logger log = LoggerFactory.getLogger(InvoiceController.class);

    private final InvoiceService invoiceService;
    private final SessionTokenHolder sessionTokenHolder;

    public InvoiceController(InvoiceService invoiceService, SessionTokenHolder sessionTokenHolder) {
        this.invoiceService = invoiceService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "tab", required = false, defaultValue = "daftar") String tab,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "search", required = false) String search,
            Model model) {

        List<InvoiceResponseDTO> invList = invoiceService.getInvoices(status, search);
        InvoiceStatsDTO stats = invoiceService.getStats();
        List<SampleReceiptResponseDTO> receiptList = invoiceService.getAvailableReceipts();

        long draftCount = stats.statusCount() != null ? stats.statusCount().getOrDefault("draft", 0L) : 0L;
        long terbitCount = stats.statusCount() != null ? stats.statusCount().getOrDefault("diterbitkan", 0L) : 0L;
        long lunasCount = stats.statusCount() != null ? stats.statusCount().getOrDefault("lunas", 0L) : 0L;
        Double totalPiutang = stats.totalPiutangNominal() != null ? stats.totalPiutangNominal() : 0.0;

        model.addAttribute("pageTitle", "Manajemen Invoice & Penagihan");
        model.addAttribute("activeTab", tab);
        model.addAttribute("invList", invList);
        model.addAttribute("receiptList", receiptList);
        model.addAttribute("draftCount", draftCount);
        model.addAttribute("terbitCount", terbitCount);
        model.addAttribute("lunasCount", lunasCount);
        model.addAttribute("totalPiutang", totalPiutang);
        model.addAttribute("statusFilter", status);
        model.addAttribute("search", search);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "invoice/index";
    }

    @PostMapping("/simpan")
    public String simpan(
            @RequestParam(name = "penerimaan_id", required = false) Long penerimaanId,
            @RequestParam("klien") String klien,
            @RequestParam(name = "alamat_klien", required = false) String alamatKlien,
            @RequestParam(name = "tanggal_invoice", required = false) String tanggalInvoice,
            @RequestParam(name = "tanggal_jatuh_tempo", required = false) String tanggalJatuhTempo,
            @RequestParam(name = "diskon_pct", required = false, defaultValue = "0") Double diskonPct,
            @RequestParam(name = "ppn_pct", required = false, defaultValue = "11") Double ppnPct,
            @RequestParam(name = "catatan", required = false) String catatan,
            @RequestParam("item_deskripsi") List<String> itemDeskripsi,
            @RequestParam("item_qty") List<Integer> itemQty,
            @RequestParam("item_harga") List<Double> itemHarga,
            RedirectAttributes redirectAttributes) {

        if (klien == null || klien.isBlank()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nama klien penerima invoice wajib diisi.");
            return "redirect:/invoice?tab=buat";
        }

        List<InvoiceItemRequestDTO> items = new ArrayList<>();
        for (int i = 0; i < itemDeskripsi.size(); i++) {
            String desc = itemDeskripsi.get(i);
            if (desc != null && !desc.isBlank()) {
                int qty = (itemQty != null && itemQty.size() > i && itemQty.get(i) != null) ? itemQty.get(i) : 1;
                double harga = (itemHarga != null && itemHarga.size() > i && itemHarga.get(i) != null) ? itemHarga.get(i) : 0.0;
                items.add(new InvoiceItemRequestDTO(desc.trim(), null, null, qty, harga, null));
            }
        }

        if (items.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Minimal satu baris rincian tagihan pengujian harus diisi.");
            return "redirect:/invoice?tab=buat";
        }

        CreateInvoiceRequestDTO request = new CreateInvoiceRequestDTO(
                null,
                penerimaanId,
                klien.trim(),
                alamatKlien != null && !alamatKlien.isBlank() ? alamatKlien.trim() : null,
                tanggalInvoice != null && !tanggalInvoice.isBlank() ? tanggalInvoice.trim() : null,
                tanggalJatuhTempo != null && !tanggalJatuhTempo.isBlank() ? tanggalJatuhTempo.trim() : null,
                diskonPct,
                ppnPct,
                "draft",
                catatan != null && !catatan.isBlank() ? catatan.trim() : null,
                items
        );

        try {
            invoiceService.simpanInvoice(request);
            redirectAttributes.addFlashAttribute("successMessage", "Draft Invoice untuk " + klien + " berhasil diterbitkan.");
        } catch (ApiException e) {
            log.warn("Gagal membuat invoice: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal membuat invoice: " + e.getMessage());
            return "redirect:/invoice?tab=buat";
        } catch (Exception e) {
            log.error("Error simpan invoice: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
            return "redirect:/invoice?tab=buat";
        }

        return "redirect:/invoice?tab=daftar";
    }

    @PostMapping("/{id}/status")
    public String updateStatus(
            @PathVariable("id") Long id,
            @RequestParam("status") String status,
            @RequestParam(name = "catatan", required = false) String catatan,
            RedirectAttributes redirectAttributes) {

        try {
            invoiceService.updateStatus(id, status, catatan);
            redirectAttributes.addFlashAttribute("successMessage", "Status invoice #" + id + " berhasil diperbarui menjadi " + status + ".");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal mengubah status invoice: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/invoice?tab=daftar";
    }
}
