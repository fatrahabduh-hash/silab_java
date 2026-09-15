package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

@Component
public class ClientPortalApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public ClientPortalApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public JsonNode getMySamples() {
        try {
            String rawJson = get("/api/v1/client-portal/my-samples", new ParameterizedTypeReference<String>() {});
            return objectMapper.readTree(rawJson).path("data");
        } catch (Exception e) {
            return objectMapper.createArrayNode();
        }
    }

    public JsonNode getMySubmissions() {
        try {
            String rawJson = get("/api/v1/client-portal/my-submissions", new ParameterizedTypeReference<String>() {});
            return objectMapper.readTree(rawJson).path("data");
        } catch (Exception e) {
            return objectMapper.createArrayNode();
        }
    }

    public JsonNode trackByCode(String code) {
        try {
            String rawJson = get("/api/v1/client-portal/track/" + code.trim(), new ParameterizedTypeReference<String>() {});
            return objectMapper.readTree(rawJson).path("data");
        } catch (Exception e) {
            return null;
        }
    }
}
