package com.labmineral.client.api;

import com.labmineral.dto.request.CreateReagentRequestDTO;
import com.labmineral.dto.request.StockAdjustRequestDTO;
import com.labmineral.dto.request.UpdateReagentRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.ReagentResponseDTO;
import com.labmineral.dto.response.ReagentStatsDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;

@Component
public class ReagentApiClient extends BaseApiClient {

    public ReagentApiClient(RestClient restClient) {
        super(restClient);
    }

    public ApiResponseWrapper<List<ReagentResponseDTO>> getReagents(Integer page, Integer limit, String search, String statusStok) {
        StringBuilder uri = new StringBuilder("/api/v1/reagents?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 100);

        if (search != null && !search.isBlank()) {
            uri.append("&search=").append(search.trim());
        }
        if (statusStok != null && !statusStok.isBlank()) {
            uri.append("&statusStok=").append(statusStok.trim());
        }

        return get(uri.toString(), new ParameterizedTypeReference<ApiResponseWrapper<List<ReagentResponseDTO>>>() {});
    }

    public ApiResponseWrapper<ReagentStatsDTO> getStats() {
        return get("/api/v1/reagents/stats", new ParameterizedTypeReference<ApiResponseWrapper<ReagentStatsDTO>>() {});
    }

    public ApiResponseWrapper<ReagentResponseDTO> getReagentById(Long id) {
        return get("/api/v1/reagents/" + id, new ParameterizedTypeReference<ApiResponseWrapper<ReagentResponseDTO>>() {});
    }

    public ApiResponseWrapper<ReagentResponseDTO> createReagent(CreateReagentRequestDTO request) {
        return post("/api/v1/reagents", request, new ParameterizedTypeReference<ApiResponseWrapper<ReagentResponseDTO>>() {});
    }

    public ApiResponseWrapper<ReagentResponseDTO> updateReagent(Long id, UpdateReagentRequestDTO request) {
        return put("/api/v1/reagents/" + id, request, new ParameterizedTypeReference<ApiResponseWrapper<ReagentResponseDTO>>() {});
    }

    public ApiResponseWrapper<ReagentResponseDTO> adjustStock(Long id, StockAdjustRequestDTO request) {
        return post("/api/v1/reagents/" + id + "/stock-adjust", request, new ParameterizedTypeReference<ApiResponseWrapper<ReagentResponseDTO>>() {});
    }

    public ApiResponseWrapper<Void> deleteReagent(Long id) {
        return delete("/api/v1/reagents/" + id, new ParameterizedTypeReference<ApiResponseWrapper<Void>>() {});
    }
}
