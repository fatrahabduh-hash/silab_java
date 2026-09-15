package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.dto.request.CreateSampleReceiptRequestDTO;
import com.labmineral.dto.request.UpdateReceiptStatusRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.SampleReceiptResponseDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.dto.response.SubmissionSummaryDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class SampleApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public SampleApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public List<SampleReceiptResponseDTO> getReceipts(Integer page, Integer limit, String search, String status) {
        StringBuilder uri = new StringBuilder("/api/v1/samples/receipts?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 100);

        if (search != null && !search.isBlank()) {
            uri.append("&search=").append(search.trim());
        }
        if (status != null && !status.isBlank()) {
            uri.append("&status=").append(status.trim());
        }

        try {
            String rawJson = get(uri.toString(), new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");
            JsonNode listNode = dataNode.has("data") ? dataNode.path("data") : dataNode;

            if (listNode.isArray()) {
                List<SampleReceiptResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, SampleReceiptResponseDTO.class));
                }
                return list;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gagal membaca daftar penerimaan: " + e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public List<SampleResponseDTO> getSamples(Integer limit) {
        return getFilteredSamples(1, limit, null, null, null, null);
    }

    public List<SampleResponseDTO> getFilteredSamples(Integer page, Integer limit, String search, String status, String metodeUji, Long penerimaanId) {
        StringBuilder uri = new StringBuilder("/api/v1/samples?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 100);

        if (search != null && !search.isBlank()) {
            uri.append("&search=").append(search.trim());
        }
        if (status != null && !status.isBlank()) {
            uri.append("&status=").append(status.trim());
        }
        if (metodeUji != null && !metodeUji.isBlank()) {
            uri.append("&metodeUji=").append(metodeUji.trim());
        }
        if (penerimaanId != null) {
            uri.append("&penerimaanId=").append(penerimaanId);
        }

        try {
            String rawJson = get(uri.toString(), new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");
            JsonNode listNode = dataNode.has("data") ? dataNode.path("data") : dataNode;

            if (listNode.isArray()) {
                List<SampleResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, SampleResponseDTO.class));
                }
                return list;
            }
        } catch (Exception ignored) {}
        return Collections.emptyList();
    }

    public void updateSampleStatus(Long id, String status) {
        patch(
                "/api/v1/samples/" + id + "/status",
                Map.of("status", status),
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }

    public SampleReceiptResponseDTO getReceiptById(Long id) {
        ApiResponseWrapper<SampleReceiptResponseDTO> response = get(
                "/api/v1/samples/receipts/" + id,
                new ParameterizedTypeReference<ApiResponseWrapper<SampleReceiptResponseDTO>>() {}
        );
        return response != null ? response.data() : null;
    }

    public SampleReceiptResponseDTO createReceipt(CreateSampleReceiptRequestDTO request) {
        ApiResponseWrapper<SampleReceiptResponseDTO> response = post(
                "/api/v1/samples/receipts",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<SampleReceiptResponseDTO>>() {}
        );
        return response != null ? response.data() : null;
    }

    public SampleReceiptResponseDTO updateReceiptStatus(Long id, UpdateReceiptStatusRequestDTO request) {
        ApiResponseWrapper<SampleReceiptResponseDTO> response = patch(
                "/api/v1/samples/receipts/" + id + "/status",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<SampleReceiptResponseDTO>>() {}
        );
        return response != null ? response.data() : null;
    }

    public List<SubmissionSummaryDTO> getApprovedSubmissions() {
        try {
            String rawJson = get("/api/v1/submissions?status=diterima&limit=50", new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");
            JsonNode listNode = dataNode.has("data") ? dataNode.path("data") : dataNode;

            if (listNode.isArray()) {
                List<SubmissionSummaryDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, SubmissionSummaryDTO.class));
                }
                return list;
            }
        } catch (Exception ignored) {}
        return Collections.emptyList();
    }

    public void convertSubmission(Long id) {
        post("/api/v1/submissions/" + id + "/convert", Map.of(), new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {});
    }
}
