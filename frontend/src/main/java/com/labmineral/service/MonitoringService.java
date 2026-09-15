package com.labmineral.service;

import com.labmineral.client.api.PreparationApiClient;
import com.labmineral.client.api.QcApiClient;
import com.labmineral.client.api.SampleApiClient;
import com.labmineral.client.api.TestResultApiClient;
import com.labmineral.client.api.WorkOrderApiClient;
import com.labmineral.dto.response.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class MonitoringService {

    private final SampleApiClient sampleApiClient;
    private final WorkOrderApiClient workOrderApiClient;
    private final PreparationApiClient preparationApiClient;
    private final TestResultApiClient testResultApiClient;
    private final QcApiClient qcApiClient;

    public MonitoringService(SampleApiClient sampleApiClient,
                             WorkOrderApiClient workOrderApiClient,
                             PreparationApiClient preparationApiClient,
                             TestResultApiClient testResultApiClient,
                             QcApiClient qcApiClient) {
        this.sampleApiClient = sampleApiClient;
        this.workOrderApiClient = workOrderApiClient;
        this.preparationApiClient = preparationApiClient;
        this.testResultApiClient = testResultApiClient;
        this.qcApiClient = qcApiClient;
    }

    public record BatchMonitoringDTO(
            Long id,
            String nomorPenerimaan,
            String klien,
            String tanggalTerima,
            Integer jumlahSampel,
            String statusGlobal,
            boolean hasWo,
            boolean hasPrep,
            boolean hasUji,
            boolean hasQc,
            boolean hasSelesai,
            int progressPct
    ) {}

    public List<BatchMonitoringDTO> getMonitoringData() {
        List<SampleReceiptResponseDTO> receipts = Collections.emptyList();
        try {
            receipts = sampleApiClient.getReceipts(1, 50, null, null);
        } catch (Exception ignored) {}

        List<WorkOrderResponseDTO> allWo = Collections.emptyList();
        try {
            allWo = workOrderApiClient.getWorkOrders(1, 100, null, null, null);
        } catch (Exception ignored) {}

        List<PreparationResponseDTO> allPrep = Collections.emptyList();
        try {
            allPrep = preparationApiClient.getPreparations(1, 100, null, null, null);
        } catch (Exception ignored) {}

        List<TestResultResponseDTO> allResults = Collections.emptyList();
        try {
            allResults = testResultApiClient.getTestResults(1, 100, null, null, null, null);
        } catch (Exception ignored) {}

        List<QcResponseDTO> allQc = Collections.emptyList();
        try {
            allQc = qcApiClient.getQcRecords(1, 100, null, null, null, null);
        } catch (Exception ignored) {}

        List<BatchMonitoringDTO> result = new ArrayList<>();

        for (SampleReceiptResponseDTO r : receipts) {
            boolean hasWo = allWo.stream().anyMatch(w -> Objects.equals(w.penerimaanId(), r.id()));
            boolean isSelesai = "selesai".equalsIgnoreCase(r.status());

            // Cari keterkaitan sampel dalam batch
            boolean hasPrep = false;
            boolean hasUji = false;
            boolean hasQc = false;

            if (r.samples() != null && !r.samples().isEmpty()) {
                Set<Long> sIds = new HashSet<>();
                for (var s : r.samples()) {
                    sIds.add(s.id());
                }
                hasPrep = allPrep.stream().anyMatch(p -> sIds.contains(p.sampelId()));
                hasUji = allResults.stream().anyMatch(h -> sIds.contains(h.sampelId()));
                hasQc = allQc.stream().anyMatch(q -> sIds.contains(q.sampelId()));
            }

            int score = 20; // Tahap 1: Penerimaan
            if (hasWo) score += 20; // Tahap 2: WO
            if (hasPrep) score += 20; // Tahap 3: Preparasi
            if (hasUji) score += 20; // Tahap 4: Pengujian
            if (hasQc || isSelesai) score += 20; // Tahap 5: QC & Selesai

            result.add(new BatchMonitoringDTO(
                    r.id(),
                    r.nomorPenerimaan(),
                    r.klien(),
                    r.tanggalTerima() != null ? r.tanggalTerima().toString() : "-",
                    r.jumlahSampel(),
                    r.status(),
                    hasWo,
                    hasPrep,
                    hasUji,
                    hasQc,
                    isSelesai,
                    Math.min(100, score)
            ));
        }

        return result;
    }
}
