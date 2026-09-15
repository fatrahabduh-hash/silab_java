package com.labmineral.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class HomeController {

    @GetMapping("/")
    public String index() {
        return "redirect:/dashboard";
    }

    @GetMapping("/xrf")
    public String xrfRedirect() {
        return "redirect:/xrf/data";
    }

    @GetMapping("/submission")
    public String submissionRedirect() {
        return "redirect:/submissions";
    }

    @GetMapping("/portal")
    public String portalRedirect() {
        return "redirect:/client-portal";
    }
}
