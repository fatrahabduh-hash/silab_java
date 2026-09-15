package com.labmineral.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public record InvoiceStatsDTO(
        @JsonProperty("totalNominal")
        Double totalNominal,

        @JsonProperty("totalLunasNominal")
        Double totalLunasNominal,

        @JsonProperty("totalPiutangNominal")
        Double totalPiutangNominal,

        @JsonProperty("statusCount")
        Map<String, Long> statusCount
) {}
