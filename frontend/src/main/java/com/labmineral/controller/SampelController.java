package com.labmineral.controller;

import com.labmineral.dto.response.SampleReceiptResponseDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.SampelService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;
import java.util.List;

@Controller
@RequestMapping("/sampel")
public class SampelController {

    private final SampelService sampelService;
    private final SessionTokenHolder sessionTokenHolder;

    private static final List<String> STATUS_OPTS = Arrays.asList("antrian", "diproses", "diuji", "selesai", "ditolak");
    private static final List<String> METODE_OPTS = Arrays.asList("AAS", "XRF", "ICP-OES", "Gravimetri", "Fire Assay", "Volumetri");

    public SampelController(SampelService sampelService, SessionTokenHolder sessionTokenHolder) {
        this.sampelService = sampelService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "metode", required = false) String metode,
            @RequestParam(name = "batch", required = false) Long batchId,
            Model model) {

        List<SampleResponseDTO> list = sampelService.getSamples(search, status, metode, batchId);
        List<SampleReceiptResponseDTO> batches = sampelService.getBatches();

        long total = list.size();
        long antrian = list.stream().filter(s -> "antrian".equalsIgnoreCase(s.status())).count();
        long diuji = list.stream().filter(s -> "diuji".equalsIgnoreCase(s.status()) || "diproses".equalsIgnoreCase(s.status())).count();
        long selesai = list.stream().filter(s -> "selesai".equalsIgnoreCase(s.status())).count();

        model.addAttribute("pageTitle", "Master Data Sampel Laboratorium");
        model.addAttribute("sampelList", list);
        model.addAttribute("batchList", batches);
        model.addAttribute("statusOpts", STATUS_OPTS);
        model.addAttribute("metodeOpts", METODE_OPTS);
        model.addAttribute("totalSampel", total);
        model.addAttribute("countAntrian", antrian);
        model.addAttribute("countDiuji", diuji);
        model.addAttribute("countSelesai", selesai);
        model.addAttribute("search", search);
        model.addAttribute("statusFilter", status);
        model.addAttribute("metodeFilter", metode);
        model.addAttribute("batchFilter", batchId);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "sampel/index";
    }

    @PostMapping("/{id}/status")
    public String updateStatus(
            @PathVariable("id") Long id,
            @RequestParam("status") String status,
            RedirectAttributes redirectAttributes) {

        try {
            sampelService.updateStatus(id, status);
            redirectAttributes.addFlashAttribute("successMessage", "Status sampel #" + id + " berhasil diperbarui menjadi " + status + ".");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal memperbarui status sampel: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/sampel";
    }
}
