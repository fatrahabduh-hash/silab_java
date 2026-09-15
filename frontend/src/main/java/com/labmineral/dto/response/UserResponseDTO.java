package com.labmineral.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UserResponseDTO(
        @JsonProperty("id")
        Long id,

        @JsonProperty("nama")
        String nama,

        @JsonProperty("username")
        String username,

        @JsonProperty("email")
        String email,

        @JsonProperty("role")
        String role,

        @JsonProperty("status")
        String status,

        @JsonProperty("createdAt")
        String createdAt
) {}
