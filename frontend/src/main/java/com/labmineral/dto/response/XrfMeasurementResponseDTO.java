package com.labmineral.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record XrfMeasurementResponseDTO(
        @JsonProperty("id")
        Long id,

        @JsonProperty("deviceId")
        String deviceId,

        @JsonProperty("dbSource")
        String dbSource,

        @JsonProperty("reportId")
        Integer reportId,

        @JsonProperty("sampleName")
        String sampleName,

        @JsonProperty("sampleSupplier")
        String sampleSupplier,

        @JsonProperty("testDate")
        String testDate,

        @JsonProperty("testTime")
        Integer testTime,

        @JsonProperty("workCurveName")
        String workCurveName,

        @JsonProperty("grade")
        String grade,

        @JsonProperty("operator")
        String operator,

        @JsonProperty("sampleId")
        Long sampleId,

        @JsonProperty("sample")
        SampleRefDTO sample,

        @JsonProperty("elements")
        List<XrfElementResponseDTO> elements
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SampleRefDTO(
            Long id,
            String kodeSampel,
            String jenisMaterial,
            String klien
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record XrfElementResponseDTO(
            Long id,
            String elementName,
            Double concentration,
            Double elementError,
            String unit
    ) {}
}
