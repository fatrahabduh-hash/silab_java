package com.labmineral.controller;

import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.MonitoringService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

@Controller
@RequestMapping("/monitoring")
public class MonitoringController {

    private final MonitoringService monitoringService;
    private final SessionTokenHolder sessionTokenHolder;

    public MonitoringController(MonitoringService monitoringService, SessionTokenHolder sessionTokenHolder) {
        this.monitoringService = monitoringService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(Model model) {
        List<MonitoringService.BatchMonitoringDTO> batches = monitoringService.getMonitoringData();

        long totalBatch = batches.size();
        long selesai = batches.stream().filter(MonitoringService.BatchMonitoringDTO::hasSelesai).count();
        long proses = totalBatch - selesai;

        model.addAttribute("pageTitle", "Monitoring Alur & Status Sampel");
        model.addAttribute("batches", batches);
        model.addAttribute("totalBatch", totalBatch);
        model.addAttribute("prosesBatch", proses);
        model.addAttribute("selesaiBatch", selesai);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "monitoring/index";
    }
}
