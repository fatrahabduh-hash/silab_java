package com.labmineral.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record QcResponseDTO(
        @JsonProperty("id")
        Long id,

        @JsonProperty("sampelId")
        Long sampelId,

        @JsonProperty("preparasiId")
        Long preparasiId,

        @JsonProperty("tipeQc")
        String tipeQc,

        @JsonProperty("parameter")
        String parameter,

        @JsonProperty("nilaiQc")
        Double nilaiQc,

        @JsonProperty("nilaiExpected")
        Double nilaiExpected,

        @JsonProperty("satuan")
        String satuan,

        @JsonProperty("persenRecovery")
        Double persenRecovery,

        @JsonProperty("rpd")
        Double rpd,

        @JsonProperty("batasMinPct")
        Double batasMinPct,

        @JsonProperty("batasMaksPct")
        Double batasMaksPct,

        @JsonProperty("flag")
        String flag,

        @JsonProperty("statusQc")
        String statusQc,

        @JsonProperty("reviewerId")
        Long reviewerId,

        @JsonProperty("catatanReview")
        String catatanReview,

        @JsonProperty("tanggalUji")
        String tanggalUji,

        @JsonProperty("createdAt")
        String createdAt,

        @JsonProperty("sample")
        SampleRefDTO sample,

        @JsonProperty("reviewer")
        ReviewerRefDTO reviewer
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SampleRefDTO(
            Long id,
            String kodeSampel,
            String jenisMaterial,
            String klien
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReviewerRefDTO(
            Long id,
            String nama,
            String username
    ) {}
}
