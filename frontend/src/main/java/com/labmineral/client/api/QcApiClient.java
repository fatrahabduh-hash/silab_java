package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.dto.request.CreateQcRequestDTO;
import com.labmineral.dto.request.ReviewQcRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.QcResponseDTO;
import com.labmineral.dto.response.QcStatsDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class QcApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public QcApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public List<QcResponseDTO> getQcRecords(Integer page, Integer limit, String tipeQc, String flag, String statusQc, String parameter) {
        StringBuilder uri = new StringBuilder("/api/v1/qc?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 100);

        if (tipeQc != null && !tipeQc.isBlank()) {
            uri.append("&tipeQc=").append(tipeQc.trim());
        }
        if (flag != null && !flag.isBlank()) {
            uri.append("&flag=").append(flag.trim());
        }
        if (statusQc != null && !statusQc.isBlank()) {
            uri.append("&statusQc=").append(statusQc.trim());
        }
        if (parameter != null && !parameter.isBlank()) {
            uri.append("&parameter=").append(parameter.trim());
        }

        try {
            String rawJson = get(uri.toString(), new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");
            JsonNode listNode = dataNode.has("data") ? dataNode.path("data") : dataNode;

            if (listNode.isArray()) {
                List<QcResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, QcResponseDTO.class));
                }
                return list;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gagal mengambil daftar catatan QC: " + e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public ApiResponseWrapper<QcStatsDTO> getStats() {
        return get("/api/v1/qc/stats", new ParameterizedTypeReference<ApiResponseWrapper<QcStatsDTO>>() {});
    }

    public Object createQc(CreateQcRequestDTO request) {
        return post(
                "/api/v1/qc",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }

    public Object reviewQc(Long id, ReviewQcRequestDTO request) {
        return patch(
                "/api/v1/qc/" + id + "/review",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }
}
