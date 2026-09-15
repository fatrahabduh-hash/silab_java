package com.labmineral.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.config.BackendProperties;
import com.labmineral.security.SessionTokenHolder;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Map;

@Controller
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final BackendProperties backendProperties;
    private final SessionTokenHolder sessionTokenHolder;
    private final ObjectMapper objectMapper;

    public AuthController(BackendProperties backendProperties,
                          SessionTokenHolder sessionTokenHolder,
                          ObjectMapper objectMapper) {
        this.backendProperties = backendProperties;
        this.sessionTokenHolder = sessionTokenHolder;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/login")
    public String loginPage(Model model) {
        if (sessionTokenHolder.getCurrentToken() != null) {
            return "redirect:/dashboard";
        }
        model.addAttribute("pageTitle", "Login — Aispektra Laboratory");
        return "auth/login";
    }

    @PostMapping("/login")
    public String processLogin(
            @RequestParam("username") String username,
            @RequestParam("password") String password,
            RedirectAttributes redirectAttributes) {

        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Mohon isi username dan password.");
            return "redirect:/login";
        }

        try {
            RestClient authClient = RestClient.builder()
                    .baseUrl(backendProperties.getBaseUrl())
                    .build();

            Map<String, String> payload = Map.of(
                    "username", username.trim(),
                    "password", password
            );

            String responseBody = authClient.post()
                    .uri("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseBody);
            if (root.has("data")) {
                JsonNode dataNode = root.get("data");
                String accessToken = dataNode.path("tokens").path("accessToken").asText();
                String nama = dataNode.path("user").path("nama").asText(username);
                String role = dataNode.path("user").path("role").asText("admin");

                sessionTokenHolder.setSessionAuth(accessToken, nama, role);
                log.info("User {} ({}) berhasil login ke sistem.", username, role);
                return "redirect:/dashboard";
            } else {
                redirectAttributes.addFlashAttribute("errorMessage", "Format respons login tidak dikenali.");
                return "redirect:/login";
            }
        } catch (Exception e) {
            log.warn("Login failed for user '{}': {}", username, e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Username atau password salah atau server tidak dapat dihubungi.");
            return "redirect:/login";
        }
    }

    @GetMapping("/logout")
    public String logout(HttpServletRequest request, RedirectAttributes redirectAttributes) {
        sessionTokenHolder.clear();
        redirectAttributes.addFlashAttribute("successMessage", "Anda telah berhasil keluar (logout).");
        return "redirect:/login";
    }
}
