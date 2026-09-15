package com.labmineral.client.api;

import com.labmineral.dto.request.CreateEquipmentRequestDTO;
import com.labmineral.dto.request.LogEquipmentUsageRequestDTO;
import com.labmineral.dto.request.UpdateEquipmentStatusRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.EquipmentResponseDTO;
import com.labmineral.dto.response.EquipmentStatsDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
public class EquipmentApiClient extends BaseApiClient {

    public EquipmentApiClient(RestClient restClient) {
        super(restClient);
    }

    public ApiResponseWrapper<List<EquipmentResponseDTO>> getEquipment(
            Integer page,
            Integer limit,
            String status,
            String search,
            String lokasi,
            String kalibrasiStatus) {

        StringBuilder uri = new StringBuilder("/api/v1/equipment?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 100);

        if (status != null && !status.isBlank()) {
            uri.append("&status=").append(status.trim());
        }
        if (search != null && !search.isBlank()) {
            uri.append("&search=").append(search.trim());
        }
        if (lokasi != null && !lokasi.isBlank()) {
            uri.append("&lokasi=").append(lokasi.trim());
        }
        if (kalibrasiStatus != null && !kalibrasiStatus.isBlank()) {
            uri.append("&kalibrasiStatus=").append(kalibrasiStatus.trim());
        }

        return get(uri.toString(), new ParameterizedTypeReference<ApiResponseWrapper<List<EquipmentResponseDTO>>>() {});
    }

    public ApiResponseWrapper<EquipmentStatsDTO> getStats() {
        return get("/api/v1/equipment/stats", new ParameterizedTypeReference<ApiResponseWrapper<EquipmentStatsDTO>>() {});
    }

    public ApiResponseWrapper<EquipmentResponseDTO> getEquipmentById(Long id) {
        return get("/api/v1/equipment/" + id, new ParameterizedTypeReference<ApiResponseWrapper<EquipmentResponseDTO>>() {});
    }

    public ApiResponseWrapper<EquipmentResponseDTO> createEquipment(CreateEquipmentRequestDTO request) {
        return post("/api/v1/equipment", request, new ParameterizedTypeReference<ApiResponseWrapper<EquipmentResponseDTO>>() {});
    }

    public ApiResponseWrapper<EquipmentResponseDTO> updateStatus(Long id, UpdateEquipmentStatusRequestDTO request) {
        return patch("/api/v1/equipment/" + id + "/status", request, new ParameterizedTypeReference<ApiResponseWrapper<EquipmentResponseDTO>>() {});
    }

    public ApiResponseWrapper<EquipmentResponseDTO> logUsage(Long id, LogEquipmentUsageRequestDTO request) {
        return post("/api/v1/equipment/" + id + "/log-usage", request, new ParameterizedTypeReference<ApiResponseWrapper<EquipmentResponseDTO>>() {});
    }

    public ApiResponseWrapper<Void> deleteEquipment(Long id) {
        return delete("/api/v1/equipment/" + id, new ParameterizedTypeReference<ApiResponseWrapper<Void>>() {});
    }
}
