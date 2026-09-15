package com.labmineral.controller;

import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.DashboardService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.Map;

@Controller
@RequestMapping("/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;
    private final SessionTokenHolder sessionTokenHolder;

    public DashboardController(DashboardService dashboardService, SessionTokenHolder sessionTokenHolder) {
        this.dashboardService = dashboardService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(Model model) {
        Map<String, Object> data = dashboardService.getDashboardData();

        model.addAttribute("pageTitle", "Dashboard Operasional Laboratorium");
        model.addAllAttributes(data);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "dashboard/index";
    }
}
