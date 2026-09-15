package com.labmineral.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.labmineral.exception.ApiException;
import com.labmineral.security.AuthTokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Configuration
public class RestClientConfig {

    @Bean
    public ClientHttpRequestFactory clientHttpRequestFactory(BackendProperties properties) {
        org.springframework.http.client.JdkClientHttpRequestFactory factory = new org.springframework.http.client.JdkClientHttpRequestFactory();
        factory.setReadTimeout(Duration.ofMillis(properties.getReadTimeoutMs()));
        return factory;
    }

    @Bean
    public RestClient backendRestClient(BackendProperties properties,
                                         ClientHttpRequestFactory requestFactory,
                                         AuthTokenProvider authTokenProvider,
                                         ObjectMapper objectMapper) {

        ClientHttpRequestInterceptor authInterceptor = (request, body, execution) -> {
            String token = authTokenProvider.resolveBearerToken();
            if (token != null && !token.isBlank() && !request.getHeaders().containsKey("Authorization")) {
                request.getHeaders().setBearerAuth(token);
            }
            return execution.execute(request, body);
        };

        return RestClient.builder()
                .baseUrl(properties.getBaseUrl())
                .requestFactory(requestFactory)
                .requestInterceptor(authInterceptor)
                .defaultStatusHandler(HttpStatusCode::isError, (req, resp) -> {
                    String rawBody = "";
                    try (InputStream is = resp.getBody()) {
                        rawBody = new String(is.readAllBytes(), StandardCharsets.UTF_8);
                    } catch (Exception ignored) {}

                    String message = "Terjadi kesalahan pada respon backend (" + resp.getStatusCode().value() + ")";
                    String errorCode = "BACKEND_ERROR";

                    try {
                        JsonNode root = objectMapper.readTree(rawBody);
                        if (root.has("message")) {
                            message = root.get("message").asText();
                        }
                        if (root.has("errors")) {
                            message = message + " -> " + root.get("errors").toString();
                        } else if (root.has("data") && root.get("data").isTextual()) {
                            message = message + " -> " + root.get("data").asText();
                        }
                        if (root.has("code")) {
                            errorCode = root.get("code").asText();
                        }
                    } catch (Exception ignored) {}

                    throw new ApiException(resp.getStatusCode(), errorCode, message);
                })
                .build();
    }
}
