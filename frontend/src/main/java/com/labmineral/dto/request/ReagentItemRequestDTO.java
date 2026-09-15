package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

public record ReagentItemRequestDTO(
        @NotNull(message = "ID bahan kimia wajib diisi")
        @JsonProperty("bahanId")
        Long bahanId,

        @NotNull(message = "Jumlah pemakaian wajib diisi")
        @Positive(message = "Jumlah pemakaian harus lebih besar dari 0")
        @JsonProperty("jumlah")
        Double jumlah,

        @JsonProperty("satuan")
        String satuan,

        @JsonProperty("lot")
        String lot
) {}
