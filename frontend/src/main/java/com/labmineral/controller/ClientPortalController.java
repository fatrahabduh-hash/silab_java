package com.labmineral.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.ClientPortalService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Controller
@RequestMapping("/client-portal")
public class ClientPortalController {

    private final ClientPortalService clientPortalService;
    private final SessionTokenHolder sessionTokenHolder;

    public ClientPortalController(ClientPortalService clientPortalService, SessionTokenHolder sessionTokenHolder) {
        this.clientPortalService = clientPortalService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String portal(@RequestParam(name = "track", required = false) String trackCode, Model model) {
        List<ClientPortalService.ClientSampleDTO> samples = clientPortalService.getMySamples();

        JsonNode trackResult = null;
        if (trackCode != null && !trackCode.isBlank()) {
            trackResult = clientPortalService.track(trackCode);
        }

        model.addAttribute("pageTitle", "Portal Pelacakan Sampel Klien");
        model.addAttribute("samples", samples);
        model.addAttribute("trackCode", trackCode);
        model.addAttribute("trackResult", trackResult);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "client/portal";
    }
}
