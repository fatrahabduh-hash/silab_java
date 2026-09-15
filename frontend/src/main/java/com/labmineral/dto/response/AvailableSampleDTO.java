package com.labmineral.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

public record AvailableSampleDTO(
    Long id,
    Long penerimaanId,
    String kodeSampel,
    LocalDate tanggalMasuk,
    String jenisMaterial,
    BigDecimal beratGram,
    String klien,
    String metodeUji,
    String keterangan,
    String status,
    Map<String, Object> receipt
) {
    public String getNomorPenerimaan() {
        if (receipt != null && receipt.containsKey("nomorPenerimaan") && receipt.get("nomorPenerimaan") != null) {
            return receipt.get("nomorPenerimaan").toString();
        }
        return null;
    }
}
