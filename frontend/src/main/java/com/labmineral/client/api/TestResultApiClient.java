package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.dto.request.CreateTestResultRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.TestResultResponseDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class TestResultApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public TestResultApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public List<TestResultResponseDTO> getTestResults(Integer page, Integer limit, String parameter, String kesimpulan, String metode, String search) {
        StringBuilder uri = new StringBuilder("/api/v1/test-results?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 100);

        if (parameter != null && !parameter.isBlank()) {
            uri.append("&parameter=").append(parameter.trim());
        }
        if (kesimpulan != null && !kesimpulan.isBlank()) {
            uri.append("&kesimpulan=").append(kesimpulan.trim());
        }
        if (metode != null && !metode.isBlank()) {
            uri.append("&metode=").append(metode.trim());
        }
        if (search != null && !search.isBlank()) {
            uri.append("&search=").append(search.trim());
        }

        try {
            String rawJson = get(uri.toString(), new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");
            JsonNode listNode = dataNode.has("data") ? dataNode.path("data") : dataNode;

            if (listNode.isArray()) {
                List<TestResultResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, TestResultResponseDTO.class));
                }
                return list;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gagal mengambil daftar hasil uji: " + e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public Object createTestResult(CreateTestResultRequestDTO request) {
        return post(
                "/api/v1/test-results",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }
}
