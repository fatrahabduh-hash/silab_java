package com.labmineral.dto.response;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public record EquipmentResponseDTO(
    Long id,
    String kodeAlat,
    String nama,
    String lokasi,
    String status,
    LocalDate tanggalKalibrasi,
    LocalDate masaBerlakuKalibrasi,
    Integer jamPakai,
    LocalDate jadwalMaintenance,
    String pic,
    String catatan,
    Integer sisaHariKalibrasi,
    String kalibrasiStatus
) {
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy", new Locale("id", "ID"));

    public String getStatusBadgeClass() {
        if (status == null) return "st-blue";
        return switch (status.toLowerCase()) {
            case "tersedia" -> "st-ok";
            case "digunakan" -> "st-blue";
            case "maintenance" -> "st-warn";
            case "rusak" -> "st-err";
            default -> "st-blue";
        };
    }

    public String getStatusLabel() {
        if (status == null || status.isBlank()) return "-";
        return Character.toUpperCase(status.charAt(0)) + status.substring(1);
    }

    public String getKalibrasiLabel() {
        if (masaBerlakuKalibrasi == null) {
            return "—";
        }
        if (sisaHariKalibrasi != null) {
            if (sisaHariKalibrasi < 0) {
                return "KADALUARSA";
            }
            if (sisaHariKalibrasi <= 14) {
                return sisaHariKalibrasi + " hari lagi";
            }
        }
        return "Valid " + masaBerlakuKalibrasi.format(DATE_FORMATTER);
    }

    public String getKalibrasiColor() {
        if (masaBerlakuKalibrasi == null) {
            return "var(--text2)";
        }
        if (sisaHariKalibrasi != null) {
            if (sisaHariKalibrasi < 0) {
                return "var(--red)";
            }
            if (sisaHariKalibrasi <= 14) {
                return "var(--yellow)";
            }
        }
        return "var(--green)";
    }
}
