package com.labmineral.controller;

import com.labmineral.dto.response.TestResultResponseDTO;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.LaporanService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/laporan")
public class LaporanController {

    private final LaporanService laporanService;
    private final SessionTokenHolder sessionTokenHolder;

    public LaporanController(LaporanService laporanService, SessionTokenHolder sessionTokenHolder) {
        this.laporanService = laporanService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(Model model) {
        List<TestResultResponseDTO> hasilTerbaru = laporanService.getLatestResults();
        List<String> klienList = laporanService.getKlienList();
        Map<String, Object> stats = laporanService.getLaporanStats();

        model.addAttribute("pageTitle", "Laporan & Sertifikat Hasil Analisis");
        model.addAttribute("hasilTerbaru", hasilTerbaru);
        model.addAttribute("klienList", klienList);
        model.addAllAttributes(stats);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "laporan/index";
    }
}
