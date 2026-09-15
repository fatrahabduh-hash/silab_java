package com.labmineral.service;

import com.labmineral.client.api.SampleApiClient;
import com.labmineral.dto.response.SampleReceiptResponseDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class SampelService {

    private final SampleApiClient sampleApiClient;

    public SampelService(SampleApiClient sampleApiClient) {
        this.sampleApiClient = sampleApiClient;
    }

    public List<SampleResponseDTO> getSamples(String search, String status, String metode, Long batchId) {
        return sampleApiClient.getFilteredSamples(1, 100, search, status, metode, batchId);
    }

    public List<SampleReceiptResponseDTO> getBatches() {
        try {
            return sampleApiClient.getReceipts(1, 50, null, null);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void updateStatus(Long id, String status) {
        sampleApiClient.updateSampleStatus(id, status);
    }
}
