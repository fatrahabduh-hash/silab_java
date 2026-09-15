package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateQcRequestDTO(
        @JsonProperty("preparasiId")
        Long preparasiId,

        @NotNull(message = "ID sampel wajib diisi")
        @JsonProperty("sampelId")
        Long sampelId,

        @NotBlank(message = "Tipe QC wajib dipilih")
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

        @JsonProperty("batasMinPct")
        Double batasMinPct,

        @JsonProperty("batasMaksPct")
        Double batasMaksPct,

        @JsonProperty("tanggalUji")
        String tanggalUji
) {}
