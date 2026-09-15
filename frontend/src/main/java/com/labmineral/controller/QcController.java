package com.labmineral.controller;

import com.labmineral.dto.request.CreateQcRequestDTO;
import com.labmineral.dto.request.ReviewQcRequestDTO;
import com.labmineral.dto.response.QcResponseDTO;
import com.labmineral.dto.response.QcStatsDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.QcService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;
import java.util.List;

@Controller
@RequestMapping("/qc")
public class QcController {

    private static final Logger log = LoggerFactory.getLogger(QcController.class);

    private final QcService qcService;
    private final SessionTokenHolder sessionTokenHolder;

    private static final List<String> TIPE_QC_OPTS = Arrays.asList("blanko", "standar", "spike", "duplikat");

    public QcController(QcService qcService, SessionTokenHolder sessionTokenHolder) {
        this.qcService = qcService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "tab", required = false, defaultValue = "daftar") String tab,
            @RequestParam(name = "tipe", required = false) String tipe,
            @RequestParam(name = "flag", required = false) String flag,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "parameter", required = false) String parameter,
            Model model) {

        List<QcResponseDTO> qcList = qcService.getQcRecords(tipe, flag, status, parameter);
        QcStatsDTO stats = qcService.getStats();
        List<SampleResponseDTO> sampelList = qcService.getAvailableSamples();

        long passCount = stats.pass() > 0 ? stats.pass() : qcList.stream().filter(q -> "pass".equalsIgnoreCase(q.flag())).count();
        long failCount = stats.fail() > 0 ? stats.fail() : qcList.stream().filter(q -> "fail".equalsIgnoreCase(q.flag())).count();
        long warnCount = stats.warning() > 0 ? stats.warning() : qcList.stream().filter(q -> "warning".equalsIgnoreCase(q.flag())).count();
        long pendingCount = stats.pending() > 0 ? stats.pending() : qcList.stream().filter(q -> "pending".equalsIgnoreCase(q.statusQc())).count();

        model.addAttribute("pageTitle", "QC & Validasi Mutu Pengujian");
        model.addAttribute("activeTab", tab);
        model.addAttribute("qcList", qcList);
        model.addAttribute("sampelList", sampelList);
        model.addAttribute("tipeQcOpts", TIPE_QC_OPTS);
        model.addAttribute("totalQc", qcList.size());
        model.addAttribute("passCount", passCount);
        model.addAttribute("failCount", failCount);
        model.addAttribute("warnCount", warnCount);
        model.addAttribute("pendingCount", pendingCount);
        model.addAttribute("passRate", stats.passRate());
        model.addAttribute("tipeFilter", tipe);
        model.addAttribute("flagFilter", flag);
        model.addAttribute("statusFilter", status);
        model.addAttribute("paramFilter", parameter);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "qc/index";
    }

    @PostMapping("/simpan")
    public String simpan(
            @RequestParam(name = "sampel_id") Long sampelId,
            @RequestParam(name = "tipe_qc") String tipeQc,
            @RequestParam(name = "parameter", required = false) String parameter,
            @RequestParam(name = "nilai_qc", required = false) Double nilaiQc,
            @RequestParam(name = "nilai_expected", required = false) Double nilaiExpected,
            @RequestParam(name = "satuan", required = false, defaultValue = "%") String satuan,
            @RequestParam(name = "batas_min_pct", required = false, defaultValue = "85.0") Double batasMinPct,
            @RequestParam(name = "batas_maks_pct", required = false, defaultValue = "115.0") Double batasMaksPct,
            @RequestParam(name = "tanggal_uji", required = false) String tanggalUji,
            RedirectAttributes redirectAttributes) {

        if (sampelId == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Pilih sampel target untuk kontrol mutu (QC).");
            return "redirect:/qc?tab=input";
        }

        CreateQcRequestDTO request = new CreateQcRequestDTO(
                null,
                sampelId,
                tipeQc,
                parameter != null && !parameter.isBlank() ? parameter.trim() : null,
                nilaiQc,
                nilaiExpected,
                satuan,
                batasMinPct,
                batasMaksPct,
                tanggalUji != null && !tanggalUji.isBlank() ? tanggalUji.trim() : null
        );

        try {
            qcService.simpanQc(request);
            redirectAttributes.addFlashAttribute("successMessage", "Data kontrol mutu (" + tipeQc + ") berhasil dicatat.");
        } catch (ApiException e) {
            log.warn("Gagal menyimpan QC: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menyimpan QC: " + e.getMessage());
            return "redirect:/qc?tab=input";
        } catch (Exception e) {
            log.error("Error simpan QC: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
            return "redirect:/qc?tab=input";
        }

        return "redirect:/qc?tab=daftar";
    }

    @PostMapping("/{id}/review")
    public String review(
            @PathVariable("id") Long id,
            @RequestParam("keputusan") String keputusan,
            @RequestParam(name = "catatan_review", required = false) String catatanReview,
            RedirectAttributes redirectAttributes) {

        try {
            ReviewQcRequestDTO req = new ReviewQcRequestDTO(keputusan, catatanReview);
            qcService.reviewQc(id, req);
            redirectAttributes.addFlashAttribute("successMessage", "Catatan QC #" + id + " berhasil di-review (" + keputusan + ").");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal me-review QC: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/qc?tab=daftar";
    }
}
