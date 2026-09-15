package com.labmineral.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.labmineral.client.api.ClientPortalApiClient;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class ClientPortalService {

    private final ClientPortalApiClient clientPortalApiClient;

    public ClientPortalService(ClientPortalApiClient clientPortalApiClient) {
        this.clientPortalApiClient = clientPortalApiClient;
    }

    public record ClientSampleDTO(
            Long id,
            String kodeSampel,
            String jenisMaterial,
            String status,
            String nomorPenerimaan,
            String tanggalTerima,
            int progressPct,
            String currentStage,
            List<String> parameters
    ) {}

    public List<ClientSampleDTO> getMySamples() {
        JsonNode dataNode = clientPortalApiClient.getMySamples();
        List<ClientSampleDTO> list = new ArrayList<>();

        if (dataNode.isArray()) {
            for (JsonNode s : dataNode) {
                Long id = s.path("id").asLong();
                String kodeSampel = s.path("kodeSampel").asText("-");
                String jenisMaterial = s.path("jenisMaterial").asText("-");
                String status = s.path("status").asText("antrian");
                String nomorPenerimaan = s.path("receipt").path("nomorPenerimaan").asText("-");
                String tanggalTerima = s.path("receipt").path("tanggalTerima").asText("-");

                boolean hasWo = s.path("workOrderSamples").size() > 0;
                boolean hasPrep = s.path("preparations").size() > 0;
                boolean hasUji = s.path("testResults").size() > 0;
                boolean hasQc = s.path("qcSamples").size() > 0;

                int progressPct = 20;
                String currentStage = "Penerimaan";
                if ("selesai".equalsIgnoreCase(status)) {
                    progressPct = 100;
                    currentStage = "Selesai";
                } else if (hasQc) {
                    progressPct = 90;
                    currentStage = "Validasi QC";
                } else if (hasUji) {
                    progressPct = 75;
                    currentStage = "Pengujian";
                } else if (hasPrep) {
                    progressPct = 50;
                    currentStage = "Preparasi";
                } else if (hasWo) {
                    progressPct = 35;
                    currentStage = "Work Order";
                }

                List<String> params = new ArrayList<>();
                for (JsonNode t : s.path("testResults")) {
                    params.add(t.path("parameter").asText() + ": " + t.path("nilai").asText() + " " + t.path("satuan").asText());
                }

                list.add(new ClientSampleDTO(
                        id, kodeSampel, jenisMaterial, status, nomorPenerimaan, tanggalTerima, progressPct, currentStage, params
                ));
            }
        }
        return list;
    }

    public JsonNode track(String code) {
        return clientPortalApiClient.trackByCode(code);
    }
}
