package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.XrfMeasurementResponseDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class XrfApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public XrfApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public List<XrfMeasurementResponseDTO> getMeasurements(Integer page, Integer limit, String search, String dbSource, String workCurve) {
        StringBuilder uri = new StringBuilder("/api/v1/xrf/measurements?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 50);

        if (search != null && !search.isBlank()) {
            uri.append("&search=").append(search.trim());
        }
        if (dbSource != null && !dbSource.isBlank()) {
            uri.append("&dbSource=").append(dbSource.trim());
        }
        if (workCurve != null && !workCurve.isBlank()) {
            uri.append("&workCurve=").append(workCurve.trim());
        }

        try {
            String rawJson = get(uri.toString(), new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");
            JsonNode listNode = dataNode.has("data") ? dataNode.path("data") : dataNode;

            if (listNode.isArray()) {
                List<XrfMeasurementResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, XrfMeasurementResponseDTO.class));
                }
                return list;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gagal mengambil data XRF: " + e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public void linkSample(Long measurementId, Long sampleId, String kodeSampel) {
        post(
                "/api/v1/xrf/measurements/" + measurementId + "/link",
                Map.of("sampleId", sampleId != null ? sampleId : 0, "kodeSampel", kodeSampel != null ? kodeSampel : ""),
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }
}
