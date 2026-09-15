package com.labmineral.dto.response;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

public record BatchAntriDTO(
    Long penerimaanId,
    String nomorPenerimaan,
    String klien,
    LocalDate tanggalTerima,
    int jumlahSampel,
    String jenisMaterial,
    String daftarSampel,
    List<AvailableSampleDTO> samples
) {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("id", "ID"));

    public String getFormattedTanggal() {
        return tanggalTerima != null ? tanggalTerima.format(FORMATTER) : "—";
    }
}
