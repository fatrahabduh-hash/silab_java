package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CreatePreparationRequestDTO(
        @JsonProperty("modeInput")
        String modeInput,

        @JsonProperty("workOrderId")
        Long workOrderId,

        @JsonProperty("sampelId")
        Long sampelId,

        @JsonProperty("sampelIds")
        List<Long> sampelIds,

        @NotBlank(message = "Metode preparasi wajib dipilih")
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

        @JsonProperty("reagen")
        List<ReagentItemRequestDTO> reagen,

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

        @JsonProperty("analisId")
        Long analisId,

        @JsonProperty("tanggalPreparasi")
        String tanggalPreparasi
) {}
