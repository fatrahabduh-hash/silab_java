package com.labmineral.service;

import com.labmineral.client.api.SampleApiClient;
import com.labmineral.client.api.XrfApiClient;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.dto.response.XrfMeasurementResponseDTO;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class XrfService {

    private final XrfApiClient xrfApiClient;
    private final SampleApiClient sampleApiClient;

    public XrfService(XrfApiClient xrfApiClient, SampleApiClient sampleApiClient) {
        this.xrfApiClient = xrfApiClient;
        this.sampleApiClient = sampleApiClient;
    }

    public List<XrfMeasurementResponseDTO> getMeasurements(String search, String dbSource, String workCurve) {
        return xrfApiClient.getMeasurements(1, 50, search, dbSource, workCurve);
    }

    public List<SampleResponseDTO> getAvailableSamples() {
        try {
            return sampleApiClient.getSamples(100);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void linkSample(Long measurementId, Long sampleId, String kodeSampel) {
        xrfApiClient.linkSample(measurementId, sampleId, kodeSampel);
    }
}
