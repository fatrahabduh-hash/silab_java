package com.labmineral.controller;

import com.labmineral.dto.request.CreateEquipmentRequestDTO;
import com.labmineral.dto.response.EquipmentResponseDTO;
import com.labmineral.dto.response.EquipmentScheduleDTO;
import com.labmineral.dto.response.EquipmentStatsDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.PeralatanService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;
import java.util.List;

@Controller
@RequestMapping("/peralatan")
public class PeralatanController {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PeralatanController.class);

    private final PeralatanService peralatanService;
    private final SessionTokenHolder sessionTokenHolder;

    private static final List<String> STATUS_OPTS = Arrays.asList("tersedia", "digunakan", "maintenance", "rusak");

    public PeralatanController(PeralatanService peralatanService, SessionTokenHolder sessionTokenHolder) {
        this.peralatanService = peralatanService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "kalibrasi", required = false) String kalibrasi,
            Model model) {

        List<EquipmentResponseDTO> list = peralatanService.getDaftarPeralatan(search, status, kalibrasi);
        EquipmentStatsDTO stats = peralatanService.getStatistikPeralatan();

        // Hitung fallback jika stats belum tersedia dari backend
        int total = stats.total() > 0 ? stats.total() : list.size();
        int tersedia = stats.tersedia() > 0 ? stats.tersedia() :
                (int) list.stream().filter(e -> "tersedia".equalsIgnoreCase(e.status())).count();
        int maintenance = stats.maintenance() > 0 ? stats.maintenance() :
                (int) list.stream().filter(e -> "maintenance".equalsIgnoreCase(e.status())).count();
        int rusak = stats.rusak() > 0 ? stats.rusak() :
                (int) list.stream().filter(e -> "rusak".equalsIgnoreCase(e.status())).count();

        // Ambil jadwal kalibrasi & maintenance terdekat
        List<EquipmentScheduleDTO> jadwal = peralatanService.getJadwalPeralatan(list);

        model.addAttribute("pageTitle", "Kondisi Peralatan");
        model.addAttribute("equipments", list);
        model.addAttribute("totalAlat", total);
        model.addAttribute("tersedia", tersedia);
        model.addAttribute("maintenance", maintenance);
        model.addAttribute("rusak", rusak);
        model.addAttribute("jadwalList", jadwal);
        model.addAttribute("statusOpts", STATUS_OPTS);
        model.addAttribute("search", search);
        model.addAttribute("statusFilter", status);
        model.addAttribute("kalibrasiFilter", kalibrasi);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "peralatan/index";
    }

    @PostMapping("/simpan")
    public String simpanPeralatan(
            @Valid @ModelAttribute("form") CreateEquipmentRequestDTO form,
            BindingResult bindingResult,
            RedirectAttributes redirectAttributes) {

        if (bindingResult.hasErrors()) {
            String errorMsg = bindingResult.getAllErrors().get(0).getDefaultMessage();
            redirectAttributes.addFlashAttribute("errorMessage", "Validasi gagal: " + errorMsg);
            return "redirect:/peralatan";
        }

        try {
            peralatanService.simpanPeralatan(form);
            redirectAttributes.addFlashAttribute("successMessage", "Peralatan baru (" + form.kodeAlat() + " - " + form.nama() + ") berhasil ditambahkan.");
        } catch (ApiException e) {
            log.warn("ApiException saat simpan peralatan: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menyimpan peralatan: " + e.getMessage());
        } catch (Exception e) {
            log.error("Exception saat simpan peralatan: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/peralatan";
    }

    @PostMapping("/{id}/status")
    public String updateStatus(
            @PathVariable("id") Long id,
            @RequestParam("status") String status,
            RedirectAttributes redirectAttributes) {

        try {
            peralatanService.updateStatus(id, status);
            redirectAttributes.addFlashAttribute("successMessage", "Status peralatan berhasil diperbarui menjadi '" + status + "'.");
        } catch (ApiException e) {
            log.warn("ApiException saat update status peralatan: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal memperbarui status: " + e.getMessage());
        } catch (Exception e) {
            log.error("Exception saat update status peralatan: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/peralatan";
    }

    @PostMapping("/{id}/log-usage")
    public String logUsage(
            @PathVariable("id") Long id,
            @RequestParam("tambahanJam") Integer tambahanJam,
            @RequestParam(name = "catatan", required = false) String catatan,
            RedirectAttributes redirectAttributes) {

        if (tambahanJam == null || tambahanJam <= 0) {
            redirectAttributes.addFlashAttribute("errorMessage", "Tambahan jam pakai harus lebih dari 0.");
            return "redirect:/peralatan";
        }

        try {
            peralatanService.logPemakaian(id, tambahanJam, catatan);
            redirectAttributes.addFlashAttribute("successMessage", "Berhasil mencatat pemakaian +" + tambahanJam + " jam.");
        } catch (ApiException e) {
            log.warn("ApiException saat log pemakaian: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal mencatat pemakaian: " + e.getMessage());
        } catch (Exception e) {
            log.error("Exception saat log pemakaian: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/peralatan";
    }

    @PostMapping("/{id}/delete")
    public String hapusPeralatan(
            @PathVariable("id") Long id,
            RedirectAttributes redirectAttributes) {

        try {
            peralatanService.hapusPeralatan(id);
            redirectAttributes.addFlashAttribute("successMessage", "Peralatan berhasil dihapus dari sistem.");
        } catch (ApiException e) {
            log.warn("ApiException saat hapus peralatan: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menghapus peralatan: " + e.getMessage());
        } catch (Exception e) {
            log.error("Exception saat hapus peralatan: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/peralatan";
    }
}
