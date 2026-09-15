package com.labmineral.dto.response;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public record SampleReceiptResponseDTO(
    Long id,
    String nomorPenerimaan,
    String klien,
    LocalDate tanggalTerima,
    Integer jumlahSampel,
    String jenisMaterial,
    String metodeUji,
    String keterangan,
    String status,
    Boolean isConfirmed,
    Map<String, Object> creator,
    Map<String, Integer> _count,
    List<SampleResponseDTO> samples,
    OffsetDateTime createdAt
) {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("id", "ID"));

    public String getFormattedTanggal() {
        return tanggalTerima != null ? tanggalTerima.format(FORMATTER) : "—";
    }

    public int getTotalSampel() {
        if (_count != null && _count.containsKey("samples")) {
            return _count.get("samples");
        }
        if (samples != null) {
            return samples.size();
        }
        return jumlahSampel != null ? jumlahSampel : 0;
    }

    public List<SampleResponseDTO> getSafeSamples() {
        return samples != null ? samples : Collections.emptyList();
    }

    public String getStatusBadgeClass() {
        if (status == null) return "st-blue";
        return switch (status.toLowerCase()) {
            case "diterima" -> "st-blue";
            case "diproses" -> "st-warn";
            case "selesai" -> "st-ok";
            case "dibatalkan" -> "st-err";
            default -> "st-blue";
        };
    }

    public String getStatusLabel() {
        if (status == null || status.isBlank()) return "-";
        return Character.toUpperCase(status.charAt(0)) + status.substring(1);
    }
}
