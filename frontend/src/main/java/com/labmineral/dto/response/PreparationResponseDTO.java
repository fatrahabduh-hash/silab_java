package com.labmineral.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PreparationResponseDTO(
        @JsonProperty("id")
        Long id,

        @JsonProperty("sampelId")
        Long sampelId,

        @JsonProperty("workOrderId")
        Long workOrderId,

        @JsonProperty("analisId")
        Long analisId,

        @JsonProperty("metodePreparasi")
        String metodePreparasi,

        @JsonProperty("prosedur")
        String prosedur,

        @JsonProperty("faktorPengenceran")
        Double faktorPengenceran,

        @JsonProperty("volumeAwalMl")
        Double volumeAwalMl,

        @JsonProperty("volumeAkhirMl")
        Double volumeAkhirMl,

        @JsonProperty("blankoDisiapkan")
        Boolean blankoDisiapkan,

        @JsonProperty("standarDisiapkan")
        Boolean standarDisiapkan,

        @JsonProperty("spikeDisiapkan")
        Boolean spikeDisiapkan,

        @JsonProperty("duplikatDisiapkan")
        Boolean duplikatDisiapkan,

        @JsonProperty("suhuRuang")
        Double suhuRuang,

        @JsonProperty("kelembaban")
        Double kelembaban,

        @JsonProperty("catatan")
        String catatan,

        @JsonProperty("tanggalPreparasi")
        String tanggalPreparasi,

        @JsonProperty("createdAt")
        String createdAt,

        @JsonProperty("sample")
        SampleRefDTO sample,

        @JsonProperty("workOrder")
        WorkOrderRefDTO workOrder,

        @JsonProperty("analyst")
        AnalystRefDTO analyst
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SampleRefDTO(
            Long id,
            String kodeSampel,
            String jenisMaterial,
            String klien
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record WorkOrderRefDTO(
            Long id,
            String nomorWo
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AnalystRefDTO(
            Long id,
            String nama,
            String username
    ) {}
}
