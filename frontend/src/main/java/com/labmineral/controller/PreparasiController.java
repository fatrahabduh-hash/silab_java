package com.labmineral.controller;

import com.labmineral.dto.request.CreatePreparationRequestDTO;
import com.labmineral.dto.response.PreparationResponseDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.dto.response.WorkOrderResponseDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.PreparasiService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;
import java.util.List;

@Controller
@RequestMapping("/preparasi")
public class PreparasiController {

    private static final Logger log = LoggerFactory.getLogger(PreparasiController.class);

    private final PreparasiService preparasiService;
    private final SessionTokenHolder sessionTokenHolder;

    private static final List<String> METODE_PREP_OPTS = Arrays.asList(
            "destruksi_asam", "ekstraksi", "pengenceran", "fusion", "lainnya"
    );

    public PreparasiController(PreparasiService preparasiService, SessionTokenHolder sessionTokenHolder) {
        this.preparasiService = preparasiService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "tab", required = false, defaultValue = "daftar") String tab,
            @RequestParam(name = "wo_id", required = false) Long woId,
            @RequestParam(name = "metode", required = false) String metode,
            Model model) {

        List<PreparationResponseDTO> prepList = preparasiService.getPreparasiList(woId, null, metode);
        List<WorkOrderResponseDTO> woAktif = preparasiService.getActiveWorkOrders();
        List<SampleResponseDTO> sampelList = preparasiService.getAvailableSamples();

        model.addAttribute("pageTitle", "Preparasi Sampel");
        model.addAttribute("activeTab", tab);
        model.addAttribute("woIdFilter", woId);
        model.addAttribute("metodeFilter", metode);
        model.addAttribute("prepList", prepList);
        model.addAttribute("woAktif", woAktif);
        model.addAttribute("sampelList", sampelList);
        model.addAttribute("metodeOpts", METODE_PREP_OPTS);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "preparasi/index";
    }

    @PostMapping("/simpan")
    public String simpan(
            @RequestParam(name = "mode_input", required = false, defaultValue = "single") String modeInput,
            @RequestParam(name = "work_order_id", required = false) Long workOrderId,
            @RequestParam(name = "sampel_id", required = false) Long sampelId,
            @RequestParam(name = "sampel_ids", required = false) List<Long> sampelIds,
            @RequestParam(name = "metode_preparasi") String metodePreparasi,
            @RequestParam(name = "prosedur", required = false) String prosedur,
            @RequestParam(name = "faktor_pengenceran", required = false, defaultValue = "1.0") Double faktorPengenceran,
            @RequestParam(name = "volume_awal_ml", required = false) Double volumeAwalMl,
            @RequestParam(name = "volume_akhir_ml", required = false) Double volumeAkhirMl,
            @RequestParam(name = "blanko_disiapkan", required = false, defaultValue = "false") Boolean blankoDisiapkan,
            @RequestParam(name = "standar_disiapkan", required = false, defaultValue = "false") Boolean standarDisiapkan,
            @RequestParam(name = "spike_disiapkan", required = false, defaultValue = "false") Boolean spikeDisiapkan,
            @RequestParam(name = "duplikat_disiapkan", required = false, defaultValue = "false") Boolean duplikatDisiapkan,
            @RequestParam(name = "suhu_ruang", required = false) Double suhuRuang,
            @RequestParam(name = "kelembaban", required = false) Double kelembaban,
            @RequestParam(name = "catatan", required = false) String catatan,
            @RequestParam(name = "tanggal_preparasi", required = false) String tanggalPreparasi,
            RedirectAttributes redirectAttributes) {

        if ("single".equalsIgnoreCase(modeInput) && sampelId == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Pilih sampel target untuk mode single.");
            return "redirect:/preparasi?tab=input";
        }
        if ("wo".equalsIgnoreCase(modeInput) && workOrderId == null && (sampelIds == null || sampelIds.isEmpty())) {
            redirectAttributes.addFlashAttribute("errorMessage", "Pilih Work Order atau sampel dalam batch.");
            return "redirect:/preparasi?tab=input";
        }

        CreatePreparationRequestDTO request = new CreatePreparationRequestDTO(
                modeInput,
                workOrderId,
                sampelId,
                sampelIds,
                metodePreparasi,
                prosedur != null && !prosedur.isBlank() ? prosedur.trim() : null,
                faktorPengenceran != null ? faktorPengenceran : 1.0,
                volumeAwalMl,
                volumeAkhirMl,
                List.of(),
                blankoDisiapkan,
                standarDisiapkan,
                spikeDisiapkan,
                duplikatDisiapkan,
                suhuRuang,
                kelembaban,
                catatan != null && !catatan.isBlank() ? catatan.trim() : null,
                null,
                tanggalPreparasi != null && !tanggalPreparasi.isBlank() ? tanggalPreparasi.trim() : null
        );

        try {
            preparasiService.simpanPreparasi(request);
            redirectAttributes.addFlashAttribute("successMessage", "Catatan preparasi sampel berhasil disimpan.");
        } catch (ApiException e) {
            log.warn("Gagal menyimpan preparasi: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menyimpan preparasi: " + e.getMessage());
            return "redirect:/preparasi?tab=input";
        } catch (Exception e) {
            log.error("Error simpan preparasi: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
            return "redirect:/preparasi?tab=input";
        }

        return "redirect:/preparasi?tab=daftar";
    }
}
