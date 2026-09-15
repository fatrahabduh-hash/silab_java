package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.dto.request.CreatePreparationRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.PreparationResponseDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class PreparationApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public PreparationApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public List<PreparationResponseDTO> getPreparations(Integer page, Integer limit, Long workOrderId, Long sampelId, String metode) {
        StringBuilder uri = new StringBuilder("/api/v1/preparations?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 100);

        if (workOrderId != null) {
            uri.append("&workOrderId=").append(workOrderId);
        }
        if (sampelId != null) {
            uri.append("&sampelId=").append(sampelId);
        }
        if (metode != null && !metode.isBlank()) {
            uri.append("&metodePreparasi=").append(metode.trim());
        }

        try {
            String rawJson = get(uri.toString(), new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");
            JsonNode listNode = dataNode.has("data") ? dataNode.path("data") : dataNode;

            if (listNode.isArray()) {
                List<PreparationResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, PreparationResponseDTO.class));
                }
                return list;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gagal mengambil daftar preparasi: " + e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public Object createPreparation(CreatePreparationRequestDTO request) {
        return post(
                "/api/v1/preparations",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }
}
