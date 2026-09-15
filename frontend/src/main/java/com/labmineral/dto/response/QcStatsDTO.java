package com.labmineral.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record QcStatsDTO(
        @JsonProperty("total")
        long total,

        @JsonProperty("pass")
        long pass,

        @JsonProperty("warning")
        long warning,

        @JsonProperty("fail")
        long fail,

        @JsonProperty("pending")
        long pending,

        @JsonProperty("passRate")
        double passRate
) {}
