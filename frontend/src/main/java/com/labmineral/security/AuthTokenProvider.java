package com.labmineral.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.config.BackendProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

@Component
public class AuthTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(AuthTokenProvider.class);

    private final SessionTokenHolder sessionTokenHolder;
    private final BackendProperties backendProperties;
    private final ObjectMapper objectMapper;
    private volatile String cachedSystemToken;
    private volatile long systemTokenExpiryMs = 0;

    public AuthTokenProvider(SessionTokenHolder sessionTokenHolder,
                             BackendProperties backendProperties,
                             ObjectMapper objectMapper) {
        this.sessionTokenHolder = sessionTokenHolder;
        this.backendProperties = backendProperties;
        this.objectMapper = objectMapper;
    }

    public String resolveBearerToken() {
        // 1. Prioritaskan token dari HTTP Session user yang sedang aktif
        String userToken = sessionTokenHolder.getCurrentToken();
        if (userToken != null && !userToken.isBlank()) {
            return userToken;
        }

        // 2. Fallback: Gunakan system token (autentikasi otomatis backend)
        long now = System.currentTimeMillis();
        if (cachedSystemToken != null && now < systemTokenExpiryMs) {
            return cachedSystemToken;
        }

        synchronized (this) {
            if (cachedSystemToken != null && now < systemTokenExpiryMs) {
                return cachedSystemToken;
            }
            obtainSystemToken();
            return cachedSystemToken;
        }
    }

    private void obtainSystemToken() {
        try {
            RestClient authClient = RestClient.builder()
                    .baseUrl(backendProperties.getBaseUrl())
                    .build();

            Map<String, String> credentials = Map.of(
                    "username", backendProperties.getAuth().getDefaultUsername(),
                    "password", backendProperties.getAuth().getDefaultPassword()
            );

            String responseJson = authClient.post()
                    .uri("/api/v1/auth/login")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(credentials)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseJson);
            if (root.has("data") && root.get("data").has("tokens")) {
                JsonNode tokens = root.get("data").get("tokens");
                cachedSystemToken = tokens.get("accessToken").asText();
                // Expire cached token 5 menit sebelum masa berlaku habis (default 1h -> 55m)
                systemTokenExpiryMs = System.currentTimeMillis() + (55 * 60 * 1000);
                log.info("System auth token successfully acquired from backend API.");
            }
        } catch (Exception e) {
            log.warn("Failed to obtain system auth token from backend: {}", e.getMessage());
        }
    }
}
