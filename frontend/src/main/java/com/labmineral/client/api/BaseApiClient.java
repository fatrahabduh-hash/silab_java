package com.labmineral.client.api;

import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;

import java.util.Map;

public abstract class BaseApiClient {

    protected final RestClient restClient;

    protected BaseApiClient(RestClient restClient) {
        this.restClient = restClient;
    }

    protected <T> T get(String uri, ParameterizedTypeReference<T> responseType) {
        return restClient.get()
                .uri(uri)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(responseType);
    }

    protected <T> T get(String uri, Map<String, ?> uriVariables, ParameterizedTypeReference<T> responseType) {
        return restClient.get()
                .uri(uri, uriVariables)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(responseType);
    }

    protected <T, R> R post(String uri, T requestBody, ParameterizedTypeReference<R> responseType) {
        return restClient.post()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(responseType);
    }

    protected <T, R> R put(String uri, T requestBody, ParameterizedTypeReference<R> responseType) {
        return restClient.put()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(responseType);
    }

    protected <T, R> R patch(String uri, T requestBody, ParameterizedTypeReference<R> responseType) {
        return restClient.patch()
                .uri(uri)
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(responseType);
    }

    protected <R> R delete(String uri, ParameterizedTypeReference<R> responseType) {
        return restClient.delete()
                .uri(uri)
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .body(responseType);
    }
}
