package com.labmineral.dto.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record LogEquipmentUsageRequestDTO(
    @NotNull(message = "Tambahan jam pakai wajib diisi")
    @Positive(message = "Tambahan jam harus berupa bilangan bulat positif")
    Integer tambahanJam,

    String catatan
) {}
