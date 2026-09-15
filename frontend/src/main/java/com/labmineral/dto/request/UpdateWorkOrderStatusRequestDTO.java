package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record UpdateWorkOrderStatusRequestDTO(
    String status,
    String catatan
) {}
