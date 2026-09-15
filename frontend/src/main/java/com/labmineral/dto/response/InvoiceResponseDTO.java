package com.labmineral.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InvoiceResponseDTO(
        @JsonProperty("id")
        Long id,

        @JsonProperty("nomorInvoice")
        String nomorInvoice,

        @JsonProperty("penerimaanId")
        Long penerimaanId,

        @JsonProperty("klien")
        String klien,

        @JsonProperty("alamatKlien")
        String alamatKlien,

        @JsonProperty("tanggalInvoice")
        String tanggalInvoice,

        @JsonProperty("tanggalJatuhTempo")
        String tanggalJatuhTempo,

        @JsonProperty("subtotal")
        Double subtotal,

        @JsonProperty("diskonPct")
        Double diskonPct,

        @JsonProperty("diskonNominal")
        Double diskonNominal,

        @JsonProperty("ppnPct")
        Double ppnPct,

        @JsonProperty("ppnNominal")
        Double ppnNominal,

        @JsonProperty("total")
        Double total,

        @JsonProperty("status")
        String status,

        @JsonProperty("catatan")
        String catatan,

        @JsonProperty("createdAt")
        String createdAt,

        @JsonProperty("receipt")
        ReceiptRefDTO receipt,

        @JsonProperty("items")
        List<InvoiceItemResponseDTO> items
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record ReceiptRefDTO(
            Long id,
            String nomorPenerimaan
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record InvoiceItemResponseDTO(
            Long id,
            String deskripsi,
            Integer qty,
            Double hargaSatuan,
            Double totalHarga,
            String catatan
    ) {}
}
