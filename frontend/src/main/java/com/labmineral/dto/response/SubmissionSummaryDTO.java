package com.labmineral.dto.response;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

public record SubmissionSummaryDTO(
    Long id,
    String nomorSubmission,
    String klien,
    String email,
    String telepon,
    LocalDate tanggalSubmit,
    String status,
    List<?> details
) {
    private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy", new Locale("id", "ID"));

    public String getFormattedTanggal() {
        return tanggalSubmit != null ? tanggalSubmit.format(FORMATTER) : "—";
    }

    public int getJumlahSampel() {
        return details != null ? details.size() : 0;
    }
}
