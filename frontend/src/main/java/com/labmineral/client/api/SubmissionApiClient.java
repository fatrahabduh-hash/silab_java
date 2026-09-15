package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.SubmissionResponseDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class SubmissionApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public SubmissionApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public List<SubmissionResponseDTO> getSubmissions(Integer page, Integer limit, String status, String search) {
        StringBuilder uri = new StringBuilder("/api/v1/submissions?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 50);

        if (status != null && !status.isBlank()) {
            uri.append("&status=").append(status.trim());
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
                List<SubmissionResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, SubmissionResponseDTO.class));
                }
                return list;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gagal mengambil permohonan sampel: " + e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public void updateStatus(Long id, String status, String catatan) {
        patch(
                "/api/v1/submissions/" + id + "/status",
                Map.of("status", status, "catatan", catatan != null ? catatan : ""),
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }

    public void convertToReceipt(Long id) {
        post(
                "/api/v1/submissions/" + id + "/convert",
                Map.of(),
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }

    public Object createSubmission(Map<String, Object> body) {
        return post(
                "/api/v1/submissions",
                body,
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }
}
