package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CreateSampleItemDTO(
    String kodeSampel,

    @NotBlank(message = "Jenis material wajib diisi")
    String jenisMaterial,

    BigDecimal beratGram,

    String metodeUji,

    String keterangan
) {}
