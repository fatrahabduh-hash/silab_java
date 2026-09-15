package com.labmineral.controller;

import com.labmineral.dto.response.SubmissionResponseDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.SubmissionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequestMapping("/submissions")
public class SubmissionController {

    private static final Logger log = LoggerFactory.getLogger(SubmissionController.class);

    private final SubmissionService submissionService;
    private final SessionTokenHolder sessionTokenHolder;

    public SubmissionController(SubmissionService submissionService, SessionTokenHolder sessionTokenHolder) {
        this.submissionService = submissionService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(
            @RequestParam(name = "status", required = false) String status,
            @RequestParam(name = "search", required = false) String search,
            Model model) {

        List<SubmissionResponseDTO> submissions = submissionService.getSubmissions(status, search);

        long pending = submissions.stream().filter(s -> "pending".equalsIgnoreCase(s.status())).count();
        long diterima = submissions.stream().filter(s -> "diterima".equalsIgnoreCase(s.status())).count();
        long dikonversi = submissions.stream().filter(s -> "dikonversi".equalsIgnoreCase(s.status())).count();

        model.addAttribute("pageTitle", "Online Sample Submissions (SSF)");
        model.addAttribute("submissions", submissions);
        model.addAttribute("totalSubmissions", submissions.size());
        model.addAttribute("countPending", pending);
        model.addAttribute("countDiterima", diterima);
        model.addAttribute("countDikonversi", dikonversi);
        model.addAttribute("statusFilter", status);
        model.addAttribute("search", search);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "submission/index";
    }

    @PostMapping("/{id}/status")
    public String updateStatus(
            @PathVariable("id") Long id,
            @RequestParam("status") String status,
            @RequestParam(name = "catatan", required = false) String catatan,
            RedirectAttributes redirectAttributes) {

        try {
            submissionService.updateStatus(id, status, catatan);
            redirectAttributes.addFlashAttribute("successMessage", "Permohonan #" + id + " berhasil diubah statusnya menjadi " + status + ".");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal mengubah status permohonan: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/submissions";
    }

    @PostMapping("/{id}/convert")
    public String convertToReceipt(
            @PathVariable("id") Long id,
            RedirectAttributes redirectAttributes) {

        try {
            submissionService.convertToReceipt(id);
            redirectAttributes.addFlashAttribute("successMessage", "Permohonan #" + id + " berhasil dikonversi menjadi Batch Penerimaan Sampel resmi.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal mengonversi permohonan: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/submissions";
    }
}
