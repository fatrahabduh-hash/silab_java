package com.labmineral.dto.response;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public record WorkOrderResponseDTO(
    Long id,
    String nomorWo,
    Long penerimaanId,
    Boolean lingkupBatch,
    Long analisId,
    Long peralatanId,
    String parameter,
    String metode,
    String prioritas,
    OffsetDateTime jadwalMulai,
    OffsetDateTime jadwalSelesai,
    String status,
    OffsetDateTime selesaiAt,
    String catatan,
    Map<String, Object> assignedAnalyst,
    Map<String, Object> equipment,
    Map<String, Object> receipt,
    Map<String, Integer> _count,
    List<WorkOrderSamplePivotDTO> workOrderSamples
) {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm", new Locale("id", "ID"));

    public int getJumlahSampel() {
        if (_count != null && _count.containsKey("workOrderSamples")) {
            return _count.get("workOrderSamples");
        }
        if (workOrderSamples != null) {
            return workOrderSamples.size();
        }
        return 0;
    }

    public List<WorkOrderSamplePivotDTO> getSafeSamples() {
        return workOrderSamples != null ? workOrderSamples : Collections.emptyList();
    }

    public String getNomorPenerimaan() {
        if (receipt != null && receipt.containsKey("nomorPenerimaan") && receipt.get("nomorPenerimaan") != null) {
            return receipt.get("nomorPenerimaan").toString();
        }
        return null;
    }

    public String getKlienBatch() {
        if (receipt != null && receipt.containsKey("klien") && receipt.get("klien") != null) {
            return receipt.get("klien").toString();
        }
        return "—";
    }

    public String getNamaAnalis() {
        if (assignedAnalyst != null && assignedAnalyst.containsKey("nama") && assignedAnalyst.get("nama") != null) {
            return assignedAnalyst.get("nama").toString();
        }
        return "Belum ditugaskan";
    }

    public String getNamaAlat() {
        if (equipment != null && equipment.containsKey("nama") && equipment.get("nama") != null) {
            return equipment.get("nama").toString();
        }
        return "—";
    }

    public String getKodeAlat() {
        if (equipment != null && equipment.containsKey("kodeAlat") && equipment.get("kodeAlat") != null) {
            return equipment.get("kodeAlat").toString();
        }
        return null;
    }

    public String getPrioritasClass() {
        if (prioritas == null) return "pri-normal";
        return switch (prioritas.toLowerCase()) {
            case "urgent" -> "pri-urgent";
            case "tinggi" -> "pri-tinggi";
            default -> "pri-normal";
        };
    }

    public String getStatusBadgeClass() {
        if (status == null) return "st-blue";
        return switch (status.toLowerCase()) {
            case "draft" -> "st-warn";
            case "aktif" -> "st-blue";
            case "selesai" -> "st-ok";
            case "dibatalkan" -> "st-err";
            default -> "st-blue";
        };
    }

    public String getStatusLabel() {
        if (status == null || status.isBlank()) return "-";
        return Character.toUpperCase(status.charAt(0)) + status.substring(1);
    }

    public String getFormattedJadwalMulai() {
        return jadwalMulai != null ? jadwalMulai.format(FORMATTER) : "—";
    }

    public String getFormattedJadwalSelesai() {
        return jadwalSelesai != null ? jadwalSelesai.format(FORMATTER) : "—";
    }
}
