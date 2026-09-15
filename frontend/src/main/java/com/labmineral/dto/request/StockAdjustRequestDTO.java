package com.labmineral.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.math.BigDecimal;

public record StockAdjustRequestDTO(
    @NotBlank(message = "Jenis penyesuaian stok wajib dipilih (masuk / keluar / opname)")
    String jenis,

    @NotNull(message = "Jumlah penyesuaian stok wajib diisi")
    @Positive(message = "Jumlah penyesuaian harus lebih dari 0")
    BigDecimal jumlah,

    String keterangan
) {}
