package com.labmineral.controller;

import com.labmineral.client.api.EquipmentApiClient;
import com.labmineral.dto.request.CreateWorkOrderRequestDTO;
import com.labmineral.dto.response.AvailableSampleDTO;
import com.labmineral.dto.response.BatchAntriDTO;
import com.labmineral.dto.response.EquipmentResponseDTO;
import com.labmineral.dto.response.WorkOrderResponseDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.WorkOrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.*;

@Controller
@RequestMapping("/work-order")
public class WorkOrderController {

    private static final Logger log = LoggerFactory.getLogger(WorkOrderController.class);

    private final WorkOrderService workOrderService;
    private final EquipmentApiClient equipmentApiClient;
    private final SessionTokenHolder sessionTokenHolder;

    private static final List<String> METODE_OPTS = Arrays.asList(
            "AAS", "XRF", "ICP-OES", "Gravimetri", "Fire Assay", "Volumetri"
    );

    public WorkOrderController(WorkOrderService workOrderService,
                               EquipmentApiClient equipmentApiClient,
                               SessionTokenHolder sessionTokenHolder) {
        this.workOrderService = workOrderService;
        this.equipmentApiClient = equipmentApiClient;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "tab", required = false, defaultValue = "daftar") String tab,
            @RequestParam(name = "q", required = false) String q,
            @RequestParam(name = "fstatus", required = false, defaultValue = "aktif_draft") String fstatus,
            Model model) {

        List<WorkOrderResponseDTO> allWo = workOrderService.getDaftarWorkOrder(q, fstatus);
        List<AvailableSampleDTO> availableSamples = workOrderService.getAvailableSamples();
        List<BatchAntriDTO> penerimaanAntri = workOrderService.getPenerimaanAntri(availableSamples);
        Map<String, Long> stats = workOrderService.getStatistik(allWo);
        List<WorkOrderResponseDTO> jadwalAlat = workOrderService.getJadwalInstrumen(allWo);
        String noAuto = workOrderService.generateNextWoNumberPreview(allWo);

        // Ambil daftar peralatan laboratorium yang tersedia
        List<EquipmentResponseDTO> alatList = Collections.emptyList();
        try {
            var eqResponse = equipmentApiClient.getEquipment(1, 100, null, null, null, null);
            if (eqResponse != null && eqResponse.data() != null) {
                alatList = eqResponse.data();
            }
        } catch (Exception ignored) {}

        // Mock/Known Analyst staff options
        List<Map<String, Object>> analisList = Arrays.asList(
                Map.of("id", 1, "nama", "Administrator Lab"),
                Map.of("id", 2, "nama", "Budi Santoso (Analis Utama)"),
                Map.of("id", 3, "nama", "Siti Rahma (Analis Kimia)"),
                Map.of("id", 4, "nama", "Hendro Wijaya (Supervisor)")
        );

        model.addAttribute("pageTitle", "Work Order");
        model.addAttribute("activeTab", tab);
        model.addAttribute("search", q);
        model.addAttribute("fStatus", fstatus);
        model.addAttribute("woList", allWo);
        model.addAttribute("statDraft", stats.getOrDefault("draft", 0L));
        model.addAttribute("statAktif", stats.getOrDefault("aktif", 0L));
        model.addAttribute("statUrgent", stats.getOrDefault("urgent", 0L));
        model.addAttribute("statSelesai", stats.getOrDefault("selesai", 0L));
        model.addAttribute("penerimaanAntri", penerimaanAntri);
        model.addAttribute("sampelSingle", availableSamples);
        model.addAttribute("alatList", alatList);
        model.addAttribute("analisList", analisList);
        model.addAttribute("metodeOpts", METODE_OPTS);
        model.addAttribute("jadwalAlat", jadwalAlat);
        model.addAttribute("noAuto", noAuto);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "work_order/index";
    }

    @PostMapping("/simpan")
    public String simpan(
            @RequestParam(name = "nomor_wo", required = false) String nomorWo,
            @RequestParam(name = "mode_wo", required = false, defaultValue = "batch") String modeWo,
            @RequestParam(name = "prioritas", required = false, defaultValue = "normal") String prioritas,
            @RequestParam(name = "penerimaan_id", required = false) Long penerimaanId,
            @RequestParam(name = "sampel_ids", required = false) List<Long> sampelIds,
            @RequestParam(name = "analis_id", required = false) Long analisId,
            @RequestParam(name = "peralatan_id", required = false) Long peralatanId,
            @RequestParam(name = "metode", required = false) String metode,
            @RequestParam(name = "parameter", required = false) String parameter,
            @RequestParam(name = "jadwal_mulai", required = false) String jadwalMulai,
            @RequestParam(name = "jadwal_selesai", required = false) String jadwalSelesai,
            @RequestParam(name = "status_awal", required = false, defaultValue = "draft") String statusAwal,
            @RequestParam(name = "catatan", required = false) String catatan,
            RedirectAttributes redirectAttributes) {

        // Validasi minimal
        if ("batch".equalsIgnoreCase(modeWo) && penerimaanId == null) {
            redirectAttributes.addFlashAttribute("errorMessage", "Pilih batch penerimaan untuk mode batch.");
            return "redirect:/work-order?tab=buat";
        }
        if ("single".equalsIgnoreCase(modeWo) && (sampelIds == null || sampelIds.isEmpty())) {
            redirectAttributes.addFlashAttribute("errorMessage", "Pilih minimal satu sampel untuk mode sampel spesifik.");
            return "redirect:/work-order?tab=buat";
        }

        // Format tanggal jika datetime-local YYYY-MM-DDTHH:mm
        String formattedMulai = jadwalMulai != null && !jadwalMulai.isBlank() ? jadwalMulai : null;
        String formattedSelesai = jadwalSelesai != null && !jadwalSelesai.isBlank() ? jadwalSelesai : null;

        CreateWorkOrderRequestDTO request = new CreateWorkOrderRequestDTO(
                nomorWo != null && !nomorWo.isBlank() ? nomorWo.trim() : null,
                modeWo,
                penerimaanId,
                sampelIds,
                analisId,
                peralatanId,
                parameter != null && !parameter.isBlank() ? parameter.trim() : null,
                metode != null && !metode.isBlank() ? metode.trim() : null,
                prioritas,
                formattedMulai,
                formattedSelesai,
                statusAwal,
                catatan != null && !catatan.isBlank() ? catatan.trim() : null
        );

        try {
            workOrderService.simpanWorkOrder(request);
            redirectAttributes.addFlashAttribute("successMessage", "Work Order baru berhasil dibuat.");
        } catch (ApiException e) {
            log.warn("Gagal membuat Work Order: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal membuat Work Order: " + e.getMessage());
            return "redirect:/work-order?tab=buat";
        } catch (Exception e) {
            log.error("Error saat membuat Work Order: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
            return "redirect:/work-order?tab=buat";
        }

        return "redirect:/work-order?tab=daftar";
    }

    @PostMapping("/{id}/aktivasi")
    public String aktivasi(
            @PathVariable("id") Long id,
            RedirectAttributes redirectAttributes) {

        try {
            workOrderService.aktivasiWorkOrder(id);
            redirectAttributes.addFlashAttribute("successMessage", "Work Order berhasil diaktifkan.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal mengaktifkan WO: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/work-order?tab=daftar";
    }

    @PostMapping("/{id}/selesaikan")
    public String selesaikan(
            @PathVariable("id") Long id,
            RedirectAttributes redirectAttributes) {

        try {
            workOrderService.selesaikanWorkOrder(id);
            redirectAttributes.addFlashAttribute("successMessage", "Work Order berhasil ditandai selesai.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menyelesaikan WO: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/work-order?tab=daftar";
    }

    @PostMapping("/{id}/batalkan")
    public String batalkan(
            @PathVariable("id") Long id,
            RedirectAttributes redirectAttributes) {

        try {
            workOrderService.batalkanWorkOrder(id);
            redirectAttributes.addFlashAttribute("successMessage", "Work Order berhasil dibatalkan.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal membatalkan WO: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/work-order?tab=daftar";
    }
}
