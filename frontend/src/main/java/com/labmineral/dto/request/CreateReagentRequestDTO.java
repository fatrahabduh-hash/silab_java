package com.labmineral.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CreateReagentRequestDTO(
    @NotBlank(message = "Kode bahan wajib diisi")
    String kodeBahan,

    @NotBlank(message = "Nama bahan kimia wajib diisi")
    String nama,

    @NotNull(message = "Stok bahan wajib diisi")
    @PositiveOrZero(message = "Stok tidak boleh bernilai negatif")
    BigDecimal stok,

    String satuan,

    @NotNull(message = "Stok minimum wajib diisi")
    @PositiveOrZero(message = "Stok minimum tidak boleh negatif")
    BigDecimal stokMinimum,

    String supplier,

    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @org.springframework.format.annotation.DateTimeFormat(pattern = "yyyy-MM-dd")
    LocalDate tanggalKadaluarsa
) {}
