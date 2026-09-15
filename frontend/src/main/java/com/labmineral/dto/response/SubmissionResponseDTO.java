package com.labmineral.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SubmissionResponseDTO(
        @JsonProperty("id")
        Long id,

        @JsonProperty("nomorSubmission")
        String nomorSubmission,

        @JsonProperty("klien")
        String klien,

        @JsonProperty("kontakPerson")
        String kontakPerson,

        @JsonProperty("email")
        String email,

        @JsonProperty("telepon")
        String telepon,

        @JsonProperty("poReferensi")
        String poReferensi,

        @JsonProperty("tanggalSubmit")
        String tanggalSubmit,

        @JsonProperty("status")
        String status,

        @JsonProperty("catatan")
        String catatan,

        @JsonProperty("details")
        List<SubmissionDetailDTO> details
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SubmissionDetailDTO(
            Long id,
            String kodeSampelKlien,
            String jenisMaterial,
            Double beratEstimasiGram,
            String parameterUji,
            String metodeDiminta,
            String prioritas,
            String catatan
    ) {}

    public int getJumlahSampel() {
        return details != null ? details.size() : 0;
    }
}
