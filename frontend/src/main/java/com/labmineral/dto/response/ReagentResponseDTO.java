package com.labmineral.dto.response;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

public record ReagentResponseDTO(
    Long id,
    String kodeBahan,
    String nama,
    BigDecimal stok,
    String satuan,
    BigDecimal stokMinimum,
    String supplier,
    LocalDate tanggalKadaluarsa,
    OffsetDateTime createdAt,
    Boolean isStokKritis,
    Integer sisaHariKadaluarsa,
    String statusKadaluarsa
) {
    public String getStatusStokBadge() {
        if (Boolean.TRUE.equals(isStokKritis)) {
            return "kritis";
        }
        if (stokMinimum != null && stok != null && stok.compareTo(stokMinimum) <= 0) {
            return "rendah";
        }
        return "aman";
    }
}
