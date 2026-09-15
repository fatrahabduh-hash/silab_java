package com.labmineral.dto.response;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public record EquipmentScheduleDTO(
    String nama,
    String kodeAlat,
    String jenis, // 'Maintenance' or 'Kalibrasi'
    LocalDate tanggal,
    String pic,
    String statusBadge, // 'kritis', 'rendah', 'aman'
    long sisaHari
) {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd MMM yyyy", new Locale("id", "ID"));

    public String getFormattedTanggal() {
        return tanggal != null ? tanggal.format(FORMATTER) : "—";
    }

    public String getBadgeClass() {
        return switch (statusBadge) {
            case "kritis" -> "st-err";
            case "rendah" -> "st-warn";
            default -> "st-ok";
        };
    }

    public String getBadgeLabel() {
        return Character.toUpperCase(statusBadge.charAt(0)) + statusBadge.substring(1);
    }
}
