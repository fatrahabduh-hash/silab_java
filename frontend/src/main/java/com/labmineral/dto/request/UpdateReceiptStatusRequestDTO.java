package com.labmineral.dto.request;

public record UpdateReceiptStatusRequestDTO(
    String status,
    Boolean isConfirmed
) {}
