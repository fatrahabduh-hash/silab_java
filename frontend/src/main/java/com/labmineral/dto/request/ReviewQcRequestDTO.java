package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record ReviewQcRequestDTO(
        @NotBlank(message = "Keputusan review wajib dipilih (disetujui / ditolak)")
        @JsonProperty("keputusan")
        String keputusan,

        @JsonProperty("catatanReview")
        String catatanReview
) {}
