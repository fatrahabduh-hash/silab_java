package com.labmineral.service;

import com.labmineral.client.api.QcApiClient;
import com.labmineral.client.api.SampleApiClient;
import com.labmineral.dto.request.CreateQcRequestDTO;
import com.labmineral.dto.request.ReviewQcRequestDTO;
import com.labmineral.dto.response.QcResponseDTO;
import com.labmineral.dto.response.QcStatsDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class QcService {

    private final QcApiClient qcApiClient;
    private final SampleApiClient sampleApiClient;

    public QcService(QcApiClient qcApiClient, SampleApiClient sampleApiClient) {
        this.qcApiClient = qcApiClient;
        this.sampleApiClient = sampleApiClient;
    }

    public List<QcResponseDTO> getQcRecords(String tipeQc, String flag, String statusQc, String parameter) {
        return qcApiClient.getQcRecords(1, 100, tipeQc, flag, statusQc, parameter);
    }

    public QcStatsDTO getStats() {
        try {
            var wrapper = qcApiClient.getStats();
            if (wrapper != null && wrapper.data() != null) {
                return wrapper.data();
            }
        } catch (Exception ignored) {}
        return new QcStatsDTO(0, 0, 0, 0, 0, 0.0);
    }

    public List<SampleResponseDTO> getAvailableSamples() {
        try {
            return sampleApiClient.getSamples(100);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void simpanQc(CreateQcRequestDTO request) {
        qcApiClient.createQc(request);
    }

    public void reviewQc(Long id, ReviewQcRequestDTO request) {
        qcApiClient.reviewQc(id, request);
    }
}
