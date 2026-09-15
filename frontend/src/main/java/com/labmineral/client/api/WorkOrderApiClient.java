package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.dto.request.CreateWorkOrderRequestDTO;
import com.labmineral.dto.request.UpdateWorkOrderStatusRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.AvailableSampleDTO;
import com.labmineral.dto.response.WorkOrderResponseDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class WorkOrderApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public WorkOrderApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public List<WorkOrderResponseDTO> getWorkOrders(Integer page, Integer limit, String search, String status, String prioritas) {
        StringBuilder uri = new StringBuilder("/api/v1/work-orders?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 100);

        if (search != null && !search.isBlank()) {
            uri.append("&search=").append(search.trim());
        }
        if (status != null && !status.isBlank() && !"semua".equalsIgnoreCase(status) && !"aktif_draft".equalsIgnoreCase(status)) {
            uri.append("&status=").append(status.trim());
        }
        if (prioritas != null && !prioritas.isBlank()) {
            uri.append("&prioritas=").append(prioritas.trim());
        }

        try {
            String rawJson = get(uri.toString(), new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");
            JsonNode listNode = dataNode.has("data") ? dataNode.path("data") : dataNode;

            if (listNode.isArray()) {
                List<WorkOrderResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, WorkOrderResponseDTO.class));
                }
                return list;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gagal mengambil daftar Work Order: " + e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public WorkOrderResponseDTO getWorkOrderById(Long id) {
        ApiResponseWrapper<WorkOrderResponseDTO> response = get(
                "/api/v1/work-orders/" + id,
                new ParameterizedTypeReference<ApiResponseWrapper<WorkOrderResponseDTO>>() {}
        );
        return response != null ? response.data() : null;
    }

    public List<AvailableSampleDTO> getAvailableSamples() {
        try {
            String rawJson = get("/api/v1/work-orders/available-samples", new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");

            if (dataNode.isArray()) {
                List<AvailableSampleDTO> list = new ArrayList<>();
                for (JsonNode item : dataNode) {
                    list.add(objectMapper.treeToValue(item, AvailableSampleDTO.class));
                }
                return list;
            }
        } catch (Exception ignored) {}
        return Collections.emptyList();
    }

    public WorkOrderResponseDTO createWorkOrder(CreateWorkOrderRequestDTO request) {
        ApiResponseWrapper<WorkOrderResponseDTO> response = post(
                "/api/v1/work-orders",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<WorkOrderResponseDTO>>() {}
        );
        return response != null ? response.data() : null;
    }

    public WorkOrderResponseDTO updateStatus(Long id, UpdateWorkOrderStatusRequestDTO request) {
        ApiResponseWrapper<WorkOrderResponseDTO> response = patch(
                "/api/v1/work-orders/" + id + "/status",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<WorkOrderResponseDTO>>() {}
        );
        return response != null ? response.data() : null;
    }
}
