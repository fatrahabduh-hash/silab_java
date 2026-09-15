package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record CreateUserRequestDTO(
        @NotBlank(message = "Nama lengkap wajib diisi")
        @JsonProperty("nama")
        String nama,

        @NotBlank(message = "Username wajib diisi")
        @JsonProperty("username")
        String username,

        @NotBlank(message = "Password wajib diisi")
        @JsonProperty("password")
        String password,

        @JsonProperty("email")
        String email,

        @NotBlank(message = "Role akun wajib dipilih")
        @JsonProperty("role")
        String role,

        @JsonProperty("status")
        String status
) {}
