package com.labmineral.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "backend.api")
public class BackendProperties {

    private String baseUrl = "http://localhost:5000";
    private int connectTimeoutMs = 5000;
    private int readTimeoutMs = 15000;
    private Auth auth = new Auth();

    public static class Auth {
        private String defaultUsername = "admin";
        private String defaultPassword = "password";

        public String getDefaultUsername() {
            return defaultUsername;
        }

        public void setDefaultUsername(String defaultUsername) {
            this.defaultUsername = defaultUsername;
        }

        public String getDefaultPassword() {
            return defaultPassword;
        }

        public void setDefaultPassword(String defaultPassword) {
            this.defaultPassword = defaultPassword;
        }
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    public void setBaseUrl(String baseUrl) {
        this.baseUrl = baseUrl;
    }

    public int getConnectTimeoutMs() {
        return connectTimeoutMs;
    }

    public void setConnectTimeoutMs(int connectTimeoutMs) {
        this.connectTimeoutMs = connectTimeoutMs;
    }

    public int getReadTimeoutMs() {
        return readTimeoutMs;
    }

    public void setReadTimeoutMs(int readTimeoutMs) {
        this.readTimeoutMs = readTimeoutMs;
    }

    public Auth getAuth() {
        return auth;
    }

    public void setAuth(Auth auth) {
        this.auth = auth;
    }
}
