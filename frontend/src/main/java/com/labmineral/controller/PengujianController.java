package com.labmineral.controller;

import com.labmineral.dto.request.CreateTestResultRequestDTO;
import com.labmineral.dto.response.EquipmentResponseDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.dto.response.TestResultResponseDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.PengujianService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;
import java.util.List;

@Controller
@RequestMapping("/pengujian")
public class PengujianController {

    private static final Logger log = LoggerFactory.getLogger(PengujianController.class);

    private final PengujianService pengujianService;
    private final SessionTokenHolder sessionTokenHolder;

    private static final List<String> METODE_OPTS = Arrays.asList("AAS", "XRF", "ICP-OES", "Gravimetri", "Fire Assay", "Volumetri");
    private static final List<String> SATUAN_OPTS = Arrays.asList("%", "g/t", "ppm", "ppb", "mg/L", "mg/kg");

    public PengujianController(PengujianService pengujianService, SessionTokenHolder sessionTokenHolder) {
        this.pengujianService = pengujianService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "tab", required = false, defaultValue = "daftar") String tab,
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "parameter", required = false) String parameter,
            @RequestParam(name = "kesimpulan", required = false) String kesimpulan,
            @RequestParam(name = "metode", required = false) String metode,
            Model model) {

        List<TestResultResponseDTO> hasilList = pengujianService.getTestResults(parameter, kesimpulan, metode, search);
        List<SampleResponseDTO> sampelList = pengujianService.getAvailableSamples();
        List<EquipmentResponseDTO> alatList = pengujianService.getAvailableEquipment();

        long total = hasilList.size();
        long lulus = hasilList.stream().filter(h -> "lulus".equalsIgnoreCase(h.kesimpulan())).count();
        long tidakLulus = hasilList.stream().filter(h -> "tidak_lulus".equalsIgnoreCase(h.kesimpulan())).count();
        long pending = total - lulus - tidakLulus;

        model.addAttribute("pageTitle", "Pengujian Laboratorium");
        model.addAttribute("activeTab", tab);
        model.addAttribute("hasilList", hasilList);
        model.addAttribute("sampelList", sampelList);
        model.addAttribute("alatList", alatList);
        model.addAttribute("metodeOpts", METODE_OPTS);
        model.addAttribute("satuanOpts", SATUAN_OPTS);
        model.addAttribute("totalHasil", total);
        model.addAttribute("totalLulus", lulus);
        model.addAttribute("totalTidakLulus", tidakLulus);
        model.addAttribute("totalPending", pending);
        model.addAttribute("search", search);
        model.addAttribute("paramFilter", parameter);
        model.addAttribute("kesFilter", kesimpulan);
        model.addAttribute("metFilter", metode);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "pengujian/index";
    }

    @PostMapping("/simpan")
    public String simpan(
            @RequestParam(name = "sampel_id") Long sampelId,
            @RequestParam(name = "parameter") String parameter,
            @RequestParam(name = "nilai") Double nilai,
            @RequestParam(name = "satuan", required = false, defaultValue = "%") String satuan,
            @RequestParam(name = "metode", required = false, defaultValue = "AAS") String metode,
            @RequestParam(name = "alat_id", required = false) Long alatId,
            @RequestParam(name = "faktor_pengenceran", required = false, defaultValue = "1.0") Double faktorPengenceran,
            @RequestParam(name = "batas_min", required = false) Double batasMin,
            @RequestParam(name = "batas_maks", required = false) Double batasMaks,
            @RequestParam(name = "kesimpulan", required = false, defaultValue = "pending") String kesimpulan,
            @RequestParam(name = "catatan", required = false) String catatan,
            @RequestParam(name = "tanggal_uji", required = false) String tanggalUji,
            RedirectAttributes redirectAttributes) {

        if (sampelId == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Pilih sampel target untuk hasil uji.");
            return "redirect:/pengujian?tab=input";
        }
        if (parameter == null || parameter.isBlank()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nama parameter uji wajib diisi.");
            return "redirect:/pengujian?tab=input";
        }
        if (nilai == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nilai pengukuran hasil uji wajib diisi.");
            return "redirect:/pengujian?tab=input";
        }

        CreateTestResultRequestDTO request = new CreateTestResultRequestDTO(
                null,
                sampelId,
                null,
                null,
                parameter.trim(),
                nilai,
                faktorPengenceran != null ? faktorPengenceran : 1.0,
                satuan,
                1.0,
                batasMin,
                batasMaks,
                metode,
                alatId,
                null,
                kesimpulan,
                catatan != null && !catatan.isBlank() ? catatan.trim() : null,
                tanggalUji != null && !tanggalUji.isBlank() ? tanggalUji.trim() : null
        );

        try {
            pengujianService.simpanHasilUji(request);
            redirectAttributes.addFlashAttribute("successMessage", "Hasil uji parameter " + parameter + " berhasil dicatat.");
        } catch (ApiException e) {
            log.warn("Gagal menyimpan hasil uji: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menyimpan hasil uji: " + e.getMessage());
            return "redirect:/pengujian?tab=input";
        } catch (Exception e) {
            log.error("Error simpan hasil uji: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
            return "redirect:/pengujian?tab=input";
        }

        return "redirect:/pengujian?tab=daftar";
    }
}
