package com.labmineral.exception;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@ControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    public String handleApiException(ApiException ex, Model model) {
        log.error("API Error [{}]: {}", ex.getStatusCode(), ex.getMessage());
        model.addAttribute("errorTitle", "Terjadi Kesalahan pada Server API (" + ex.getStatusCode().value() + ")");
        model.addAttribute("errorMessage", ex.getMessage());
        model.addAttribute("errorCode", ex.getErrorCode());
        return "error/error";
    }

    @ExceptionHandler(ResourceAccessException.class)
    public String handleConnectionError(ResourceAccessException ex, Model model) {
        log.error("Backend Connection Error: {}", ex.getMessage());
        model.addAttribute("errorTitle", "Layanan Backend API Tidak Tersedia");
        model.addAttribute("errorMessage", "Tidak dapat terhubung ke Backend API Engine (Express/Prisma). Pastikan server backend sedang berjalan.");
        model.addAttribute("errorCode", "BACKEND_UNAVAILABLE");
        return "error/error";
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public String handleNotFound(NoResourceFoundException ex, Model model) {
        model.addAttribute("errorTitle", "Halaman Tidak Ditemukan (404)");
        model.addAttribute("errorMessage", "Halaman yang Anda cari tidak tersedia atau URL salah.");
        model.addAttribute("errorCode", "NOT_FOUND");
        return "error/error";
    }

    @ExceptionHandler(Exception.class)
    public String handleGeneralException(Exception ex, Model model) {
        log.error("Unhandled Exception: ", ex);
        model.addAttribute("errorTitle", "Terjadi Kesalahan Sistem (500)");
        model.addAttribute("errorMessage", "Terjadi gangguan pemrosesan data pada aplikasi. Silakan hubungi administrator laboratorium.");
        model.addAttribute("errorCode", "INTERNAL_SERVER_ERROR");
        return "error/error";
    }
}
