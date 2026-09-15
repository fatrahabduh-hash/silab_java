package com.labmineral.dto.response;

import java.util.Map;

public record ApiResponseWrapper<T>(
    String status,
    String message,
    String code,
    T data,
    Map<String, Object> meta
) {
    public boolean isSuccess() {
        return "success".equalsIgnoreCase(status);
    }
}
