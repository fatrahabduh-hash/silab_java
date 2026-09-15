package com.labmineral.controller;

import com.labmineral.dto.request.CreateSampleItemDTO;
import com.labmineral.dto.request.CreateSampleReceiptRequestDTO;
import com.labmineral.dto.response.SampleReceiptResponseDTO;
import com.labmineral.dto.response.SubmissionSummaryDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.PenerimaanService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/penerimaan")
public class PenerimaanController {

    private static final Logger log = LoggerFactory.getLogger(PenerimaanController.class);

    private final PenerimaanService penerimaanService;
    private final SessionTokenHolder sessionTokenHolder;

    private static final List<String> MATERIAL_OPTS = Arrays.asList(
            "Bijih Emas", "Nikel Laterit", "Tembaga", "Bauksit", "Bijih Besi", "Timbal/Seng", "Mangan", "Kromit", "Lainnya"
    );

    private static final List<String> METODE_OPTS = Arrays.asList(
            "AAS", "XRF", "ICP-OES", "Gravimetri", "Fire Assay", "Volumetri"
    );

    private static final List<String> STATUS_OPTS = Arrays.asList(
            "diterima", "diproses", "selesai", "dibatalkan"
    );

    public PenerimaanController(PenerimaanService penerimaanService, SessionTokenHolder sessionTokenHolder) {
        this.penerimaanService = penerimaanService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "tab", required = false, defaultValue = "daftar") String tab,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "status", required = false) String status,
            Model model) {

        List<SampleReceiptResponseDTO> receipts = penerimaanService.getDaftarPenerimaan(q, status);
        List<SubmissionSummaryDTO> submissions = penerimaanService.getSubmissionsSiapProses();
        String noAuto = penerimaanService.generateNextReceiptNumberPreview(receipts);

        model.addAttribute("pageTitle", "Penerimaan Sampel");
        model.addAttribute("activeTab", tab);
        model.addAttribute("search", q);
        model.addAttribute("statusFilter", status);
        model.addAttribute("recList", receipts);
        model.addAttribute("submissionsList", submissions);
        model.addAttribute("noAuto", noAuto);
        model.addAttribute("materialOpts", MATERIAL_OPTS);
        model.addAttribute("metodeOpts", METODE_OPTS);
        model.addAttribute("statusOpts", STATUS_OPTS);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "penerimaan/index";
    }

    @PostMapping("/simpan")
    public String simpanPenerimaan(
            @RequestParam("nomorPenerimaan") String nomorPenerimaan,
            @RequestParam("klien") String klien,
            @RequestParam(name = "tanggalTerima", required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate tanggalTerima,
            @RequestParam(name = "keterangan", required = false) String keterangan,
            @RequestParam Map<String, String> allParams,
            RedirectAttributes redirectAttributes) {

        if (klien == null || klien.trim().isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nama klien / perusahaan wajib diisi.");
            return "redirect:/penerimaan?tab=batch";
        }

        log.info("Received simpan penerimaan with param keys: {}", allParams.keySet());

        // Parse dynamic sampel inputs using robust regex / key inspection
        List<CreateSampleItemDTO> samples = new ArrayList<>();
        java.util.Set<String> indices = new java.util.TreeSet<>();
        for (String key : allParams.keySet()) {
            if (key.startsWith("sampel[") && key.contains("]")) {
                int start = key.indexOf('[') + 1;
                int end = key.indexOf(']');
                if (start > 0 && end > start) {
                    indices.add(key.substring(start, end));
                }
            }
        }

        for (String idx : indices) {
            String mat = allParams.get("sampel[" + idx + "][jenis_material]");
            String beratStr = allParams.get("sampel[" + idx + "][berat_gram]");
            String met = allParams.get("sampel[" + idx + "][metode_uji]");
            String ket = allParams.get("sampel[" + idx + "][keterangan]");

            if (mat != null && !mat.trim().isEmpty()) {
                BigDecimal berat = null;
                if (beratStr != null && !beratStr.trim().isEmpty()) {
                    try {
                        berat = new BigDecimal(beratStr.trim());
                    } catch (NumberFormatException ignored) {}
                }
                samples.add(new CreateSampleItemDTO(null, mat.trim(), berat, met != null ? met.trim() : null, ket != null ? ket.trim() : null));
            }
        }

        if (samples.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Minimal 1 sampel harus dimasukkan ke dalam batch.");
            return "redirect:/penerimaan?tab=batch";
        }

        CreateSampleReceiptRequestDTO request = new CreateSampleReceiptRequestDTO(
                nomorPenerimaan != null && !nomorPenerimaan.isBlank() ? nomorPenerimaan.trim() : null,
                klien.trim(),
                tanggalTerima != null ? tanggalTerima : LocalDate.now(),
                keterangan != null ? keterangan.trim() : null,
                samples
        );

        try {
            penerimaanService.simpanPenerimaan(request);
            redirectAttributes.addFlashAttribute("successMessage", "Batch Penerimaan (" + klien + ") dengan " + samples.size() + " sampel berhasil disimpan.");
        } catch (ApiException e) {
            log.warn("Gagal simpan penerimaan via backend: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menyimpan penerimaan: " + e.getMessage());
            return "redirect:/penerimaan?tab=batch";
        } catch (Exception e) {
            log.error("Error simpan penerimaan: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan sistem: " + e.getMessage());
            return "redirect:/penerimaan?tab=batch";
        }

        return "redirect:/penerimaan?tab=daftar";
    }

    @PostMapping("/{id}/status")
    public String updateStatus(
            @PathVariable("id") Long id,
            @RequestParam("status") String status,
            RedirectAttributes redirectAttributes) {

        try {
            penerimaanService.updateStatus(id, status);
            redirectAttributes.addFlashAttribute("successMessage", "Status penerimaan berhasil diperbarui menjadi '" + status + "'.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal memperbarui status: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/penerimaan?tab=daftar";
    }

    @PostMapping("/submission/{id}/process")
    public String processSubmission(
            @PathVariable("id") Long id,
            RedirectAttributes redirectAttributes) {

        try {
            penerimaanService.prosesSubmission(id);
            redirectAttributes.addFlashAttribute("successMessage", "Submission berhasil dikonversi menjadi Batch Penerimaan Sampel resmi.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal memproses submission: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/penerimaan?tab=daftar";
    }
}
