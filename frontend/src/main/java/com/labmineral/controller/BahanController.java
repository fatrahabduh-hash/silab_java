package com.labmineral.controller;

import com.labmineral.dto.request.CreateReagentRequestDTO;
import com.labmineral.dto.request.StockAdjustRequestDTO;
import com.labmineral.dto.response.ReagentResponseDTO;
import com.labmineral.dto.response.ReagentStatsDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.BahanService;
import jakarta.validation.Valid;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;
import java.util.List;

@Controller
@RequestMapping("/bahan")
public class BahanController {

    private final BahanService bahanService;
    private final SessionTokenHolder sessionTokenHolder;

    public BahanController(BahanService bahanService, SessionTokenHolder sessionTokenHolder) {
        this.bahanService = bahanService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "status", required = false) String status,
            Model model) {

        List<ReagentResponseDTO> list = bahanService.getDaftarBahan(search, status);
        ReagentStatsDTO stats = bahanService.getStatistikBahan();

        // Hitung status kritis & rendah jika stats dari backend kosong
        long countKritis = stats.stokKritis() > 0 ? stats.stokKritis() :
                list.stream().filter(r -> "kritis".equals(r.getStatusStokBadge())).count();
        long countRendah = list.stream().filter(r -> "rendah".equals(r.getStatusStokBadge())).count();

        model.addAttribute("pageTitle", "Inventaris Bahan & Reagen");
        model.addAttribute("reagents", list);
        model.addAttribute("totalBahan", stats.totalItem() > 0 ? stats.totalItem() : list.size());
        model.addAttribute("stokKritis", countKritis);
        model.addAttribute("stokRendah", countRendah);
        model.addAttribute("satuanOpts", Arrays.asList("Liter", "mL", "kg", "gram", "Ampul", "Botol", "Pak"));
        model.addAttribute("search", search);
        model.addAttribute("statusFilter", status);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "bahan/index";
    }

    @PostMapping("/simpan")
    public String simpanBahan(
            @Valid @ModelAttribute("form") CreateReagentRequestDTO form,
            BindingResult bindingResult,
            RedirectAttributes redirectAttributes) {

        if (bindingResult.hasErrors()) {
            String errorMsg = bindingResult.getAllErrors().get(0).getDefaultMessage();
            redirectAttributes.addFlashAttribute("errorMessage", "Validasi gagal: " + errorMsg);
            return "redirect:/bahan";
        }

        try {
            bahanService.simpanBahan(form);
            redirectAttributes.addFlashAttribute("successMessage", "Bahan " + form.kodeBahan() + " berhasil ditambahkan.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menyimpan bahan: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/bahan";
    }

    @PostMapping("/{id}/adjust")
    public String adjustStok(
            @PathVariable("id") Long id,
            @Valid @ModelAttribute StockAdjustRequestDTO form,
            BindingResult bindingResult,
            RedirectAttributes redirectAttributes) {

        if (bindingResult.hasErrors()) {
            String errorMsg = bindingResult.getAllErrors().get(0).getDefaultMessage();
            redirectAttributes.addFlashAttribute("errorMessage", "Validasi penyesuaian gagal: " + errorMsg);
            return "redirect:/bahan";
        }

        try {
            bahanService.adjustStok(id, form);
            redirectAttributes.addFlashAttribute("successMessage", "Penyesuaian stok (" + form.jenis() + ") berhasil disimpan.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menyesuaikan stok: " + e.getMessage());
        }

        return "redirect:/bahan";
    }

    @PostMapping("/{id}/delete")
    public String hapusBahan(
            @PathVariable("id") Long id,
            RedirectAttributes redirectAttributes) {

        try {
            bahanService.hapusBahan(id);
            redirectAttributes.addFlashAttribute("successMessage", "Bahan berhasil dihapus.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menghapus bahan: " + e.getMessage());
        }

        return "redirect:/bahan";
    }
}
