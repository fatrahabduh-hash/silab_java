package com.labmineral.controller;

import com.labmineral.dto.request.CreateUserRequestDTO;
import com.labmineral.dto.response.UserResponseDTO;
import com.labmineral.exception.ApiException;
import com.labmineral.security.SessionTokenHolder;
import com.labmineral.service.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.Arrays;
import java.util.List;

@Controller
@RequestMapping("/pengguna")
public class PenggunaController {

    private static final Logger log = LoggerFactory.getLogger(PenggunaController.class);

    private final UserService userService;
    private final SessionTokenHolder sessionTokenHolder;

    private static final List<String> ROLE_OPTS = Arrays.asList("analis", "admin", "supervisor", "client");

    public PenggunaController(UserService userService, SessionTokenHolder sessionTokenHolder) {
        this.userService = userService;
        this.sessionTokenHolder = sessionTokenHolder;
    }

    @GetMapping
    public String index(Model model) {
        List<UserResponseDTO> users = userService.getAllUsers();

        model.addAttribute("pageTitle", "Manajemen Pengguna Laboratorium");
        model.addAttribute("users", users);
        model.addAttribute("roleOpts", ROLE_OPTS);
        model.addAttribute("userNama", sessionTokenHolder.getCurrentUserNama());
        model.addAttribute("userRole", sessionTokenHolder.getCurrentUserRole());

        return "pengguna/index";
    }

    @PostMapping("/simpan")
    public String simpan(
            @RequestParam("nama") String nama,
            @RequestParam("username") String username,
            @RequestParam("password") String password,
            @RequestParam("password2") String password2,
            @RequestParam(name = "email", required = false) String email,
            @RequestParam("role") String role,
            @RequestParam(name = "status", required = false, defaultValue = "aktif") String status,
            RedirectAttributes redirectAttributes) {

        if (!password.equals(password2)) {
            redirectAttributes.addFlashAttribute("errorMessage", "Password dan konfirmasi password tidak cocok.");
            return "redirect:/pengguna";
        }

        CreateUserRequestDTO request = new CreateUserRequestDTO(
                nama.trim(),
                username.trim(),
                password,
                email != null && !email.isBlank() ? email.trim() : null,
                role,
                status
        );

        try {
            userService.createUser(request);
            redirectAttributes.addFlashAttribute("successMessage", "Pengguna '" + username + "' berhasil ditambahkan.");
        } catch (ApiException e) {
            log.warn("Gagal membuat user: {}", e.getMessage());
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal menambahkan user: " + e.getMessage());
        } catch (Exception e) {
            log.error("Error simpan user: ", e);
            redirectAttributes.addFlashAttribute("errorMessage", "Terjadi kesalahan: " + e.getMessage());
        }

        return "redirect:/pengguna";
    }
}
