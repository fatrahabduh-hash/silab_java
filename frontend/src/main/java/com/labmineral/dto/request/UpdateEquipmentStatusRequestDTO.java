package com.labmineral.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record UpdateEquipmentStatusRequestDTO(
    @NotBlank(message = "Status wajib dipilih")
    @Pattern(regexp = "^(tersedia|digunakan|maintenance|rusak)$", message = "Status harus berupa: tersedia, digunakan, maintenance, atau rusak")
    String status
) {}
