package com.labmineral.controller;

import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.dto.response.XrfMeasurementResponseDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.XrfService;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.List;

@Controller
@RequestMapping("/xrf")
public class XrfController {

    private final XrfService xrfService;
    private final SessionTokenHolder sessionTokenHolder;

    public XrfController(XrfService xrfService, SessionTokenHolder sessionTokenHolder) {
        this.xrfService = xrfService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping("/data")
    public String dataExplorer(
            @RequestParam(name = "search", required = false) String search,
            @RequestParam(name = "dbSource", required = false) String dbSource,
            @RequestParam(name = "workCurve", required = false) String workCurve,
            Model model) {

        List<XrfMeasurementResponseDTO> list = xrfService.getMeasurements(search, dbSource, workCurve);
        List<SampleResponseDTO> sampelList = xrfService.getAvailableSamples();

        model.addAttribute("pageTitle", "Data XRF Explorer 7000");
        model.addAttribute("xrfList", list);
        model.addAttribute("sampelList", sampelList);
        model.addAttribute("totalRows", list.size());
        model.addAttribute("search", search);
        model.addAttribute("dbSourceFilter", dbSource);
        model.addAttribute("workCurveFilter", workCurve);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "xrf/data";
    }

    @PostMapping("/measurements/{id}/link")
    public String linkSample(
            @PathVariable("id") Long id,
            @RequestParam("sampel_id") Long sampelId,
            RedirectAttributes redirectAttributes) {

        try {
            xrfService.linkSample(id, sampelId, null);
            redirectAttributes.addFlashAttribute("successMessage", "Pengukuran XRF #" + id + " berhasil ditautkan ke sampel.");
        } catch (ApiException e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menautkan: " + e.getMessage());
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/xrf/data";
    }
}
