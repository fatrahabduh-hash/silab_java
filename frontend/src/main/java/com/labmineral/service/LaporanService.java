package com.labmineral.service;

import com.labmineral.client.api.SampleApiClient;
import com.labmineral.client.api.TestResultApiClient;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.dto.response.TestResultResponseDTO;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class LaporanService {

    private final TestResultApiClient testResultApiClient;
    private final SampleApiClient sampleApiClient;

    public LaporanService(TestResultApiClient testResultApiClient, SampleApiClient sampleApiClient) {
        this.testResultApiClient = testResultApiClient;
        this.sampleApiClient = sampleApiClient;
    }

    public List<TestResultResponseDTO> getLatestResults() {
        return testResultApiClient.getTestResults(1, 50, null, null, null, null);
    }

    public List<String> getKlienList() {
        try {
            List<SampleResponseDTO> samples = sampleApiClient.getSamples(100);
            return samples.stream()
                    .map(SampleResponseDTO::klien)
                    .filter(k -> k != null && !k.isBlank())
                    .distinct()
                    .sorted()
                    .collect(Collectors.toList());
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public Map<String, Object> getLaporanStats() {
        Map<String, Object> stats = new HashMap<>();
        List<TestResultResponseDTO> results = Collections.emptyList();
        try {
            results = testResultApiClient.getTestResults(1, 100, null, null, null, null);
        } catch (Exception ignored) {}

        long totalUji = results.size();
        long lulus = results.stream().filter(r -> "lulus".equalsIgnoreCase(r.kesimpulan())).count();
        long pctLulus = totalUji > 0 ? Math.round((double) lulus / totalUji * 100) : 0;

        List<SampleResponseDTO> samples = Collections.emptyList();
        try {
            samples = sampleApiClient.getSamples(100);
        } catch (Exception ignored) {}

        long sampelSelesai = samples.stream().filter(s -> "selesai".equalsIgnoreCase(s.status())).count();

        stats.put("totalUji", totalUji);
        stats.put("lulus", lulus);
        stats.put("pctLulus", pctLulus);
        stats.put("sampelSelesai", sampelSelesai);
        return stats;
    }
}
