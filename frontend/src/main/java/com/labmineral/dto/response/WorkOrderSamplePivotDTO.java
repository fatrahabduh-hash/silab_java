package com.labmineral.dto.response;

public record WorkOrderSamplePivotDTO(
    Long id,
    Long woId,
    Long sampelId,
    SampleResponseDTO sample
) {}
