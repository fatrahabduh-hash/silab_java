package com.labmineral.exception;

import org.springframework.http.HttpStatusCode;

public class ApiException extends RuntimeException {

    private final HttpStatusCode statusCode;
    private final String errorCode;

    public ApiException(HttpStatusCode statusCode, String message) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = "API_ERROR";
    }

    public ApiException(HttpStatusCode statusCode, String errorCode, String message) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
    }

    public HttpStatusCode getStatusCode() {
        return statusCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
