package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.dto.request.CreateInvoiceRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.InvoiceResponseDTO;
import com.labmineral.dto.response.InvoiceStatsDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Component
public class InvoiceApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public InvoiceApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public List<InvoiceResponseDTO> getInvoices(Integer page, Integer limit, String status, String search) {
        StringBuilder uri = new StringBuilder("/api/v1/invoices?page=").append(page != null ? page : 1)
                .append("&limit=").append(limit != null ? limit : 100);

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
                List<InvoiceResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, InvoiceResponseDTO.class));
                }
                return list;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gagal mengambil daftar invoice: " + e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public ApiResponseWrapper<InvoiceStatsDTO> getStats() {
        return get("/api/v1/invoices/stats", new ParameterizedTypeReference<ApiResponseWrapper<InvoiceStatsDTO>>() {});
    }

    public Object createInvoice(CreateInvoiceRequestDTO request) {
        return post(
                "/api/v1/invoices",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }

    public Object updateStatus(Long id, String status, String catatan) {
        Map<String, String> body = Map.of(
                "status", status,
                "catatan", catatan != null ? catatan : ""
        );
        return patch(
                "/api/v1/invoices/" + id + "/status",
                body,
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }
}
