package com.labmineral.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;

public record SampleResponseDTO(
    Long id,
    Long penerimaanId,
    String kodeSampel,
    LocalDate tanggalMasuk,
    String jenisMaterial,
    BigDecimal beratGram,
    String klien,
    String metodeUji,
    String keterangan,
    String status
) {
    public String getStatusBadgeClass() {
        if (status == null) return "st-blue";
        return switch (status.toLowerCase()) {
            case "antrian" -> "st-blue";
            case "diuji" -> "st-ok";
            case "review" -> "st-warn";
            case "selesai" -> "st-ok";
            case "ditolak" -> "st-err";
            default -> "st-blue";
        };
    }

    public String getStatusLabel() {
        if (status == null || status.isBlank()) return "-";
        return Character.toUpperCase(status.charAt(0)) + status.substring(1);
    }
}
