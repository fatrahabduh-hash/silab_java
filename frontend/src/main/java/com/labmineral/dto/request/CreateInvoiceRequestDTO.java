package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record CreateInvoiceRequestDTO(
        @JsonProperty("nomorInvoice")
        String nomorInvoice,

        @JsonProperty("penerimaanId")
        Long penerimaanId,

        @NotBlank(message = "Nama klien wajib diisi")
        @JsonProperty("klien")
        String klien,

        @JsonProperty("alamatKlien")
        String alamatKlien,

        @JsonProperty("tanggalInvoice")
        String tanggalInvoice,

        @JsonProperty("tanggalJatuhTempo")
        String tanggalJatuhTempo,

        @JsonProperty("diskonPct")
        Double diskonPct,

        @JsonProperty("ppnPct")
        Double ppnPct,

        @JsonProperty("status")
        String status,

        @JsonProperty("catatan")
        String catatan,

        @NotEmpty(message = "Minimal satu rincian item tagihan wajib disertakan")
        @JsonProperty("items")
        List<InvoiceItemRequestDTO> items
) {}
