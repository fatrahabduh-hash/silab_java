package com.labmineral.client.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.dto.request.CreateUserRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.UserResponseDTO;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class UserApiClient extends BaseApiClient {

    private final ObjectMapper objectMapper;

    public UserApiClient(RestClient restClient, ObjectMapper objectMapper) {
        super(restClient);
        this.objectMapper = objectMapper;
    }

    public List<UserResponseDTO> getUsers() {
        try {
            String rawJson = get("/api/v1/auth/users", new ParameterizedTypeReference<String>() {});
            JsonNode root = objectMapper.readTree(rawJson);
            JsonNode dataNode = root.path("data");
            JsonNode listNode = dataNode.has("data") ? dataNode.path("data") : dataNode;

            if (listNode.isArray()) {
                List<UserResponseDTO> list = new ArrayList<>();
                for (JsonNode item : listNode) {
                    list.add(objectMapper.treeToValue(item, UserResponseDTO.class));
                }
                return list;
            }
        } catch (Exception e) {
            throw new RuntimeException("Gagal mengambil daftar pengguna: " + e.getMessage(), e);
        }
        return Collections.emptyList();
    }

    public Object createUser(CreateUserRequestDTO request) {
        return post(
                "/api/v1/auth/users",
                request,
                new ParameterizedTypeReference<ApiResponseWrapper<Object>>() {}
        );
    }
}
