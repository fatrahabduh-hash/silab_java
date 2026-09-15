package com.labmineral.service;

import com.labmineral.client.api.PreparationApiClient;
import com.labmineral.client.api.SampleApiClient;
import com.labmineral.client.api.WorkOrderApiClient;
import com.labmineral.dto.request.CreatePreparationRequestDTO;
import com.labmineral.dto.response.PreparationResponseDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.dto.response.WorkOrderResponseDTO;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class PreparasiService {

    private final PreparationApiClient preparationApiClient;
    private final WorkOrderApiClient workOrderApiClient;
    private final SampleApiClient sampleApiClient;

    public PreparasiService(PreparationApiClient preparationApiClient,
                            WorkOrderApiClient workOrderApiClient,
                            SampleApiClient sampleApiClient) {
        this.preparationApiClient = preparationApiClient;
        this.workOrderApiClient = workOrderApiClient;
        this.sampleApiClient = sampleApiClient;
    }

    public List<PreparationResponseDTO> getPreparasiList(Long workOrderId, Long sampelId, String metode) {
        return preparationApiClient.getPreparations(1, 100, workOrderId, sampelId, metode);
    }

    public List<WorkOrderResponseDTO> getActiveWorkOrders() {
        try {
            return workOrderApiClient.getWorkOrders(1, 50, null, "aktif", null);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public List<SampleResponseDTO> getAvailableSamples() {
        try {
            return sampleApiClient.getSamples(100);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void simpanPreparasi(CreatePreparationRequestDTO request) {
        preparationApiClient.createPreparation(request);
    }
}
