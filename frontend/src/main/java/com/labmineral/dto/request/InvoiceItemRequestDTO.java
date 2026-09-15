package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record InvoiceItemRequestDTO(
        @NotBlank(message = "Deskripsi item tagihan wajib diisi")
        @JsonProperty("deskripsi")
        String deskripsi,

        @JsonProperty("sampelId")
        Long sampelId,

        @JsonProperty("tarifId")
        Long tarifId,

        @NotNull(message = "Qty wajib diisi")
        @Positive(message = "Qty minimal 1")
        @JsonProperty("qty")
        Integer qty,

        @NotNull(message = "Harga satuan wajib diisi")
        @JsonProperty("hargaSatuan")
        Double hargaSatuan,

        @JsonProperty("catatan")
        String catatan
) {}
