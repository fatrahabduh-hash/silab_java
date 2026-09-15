package com.labmineral.service;

import com.labmineral.client.api.EquipmentApiClient;
import com.labmineral.client.api.SampleApiClient;
import com.labmineral.client.api.TestResultApiClient;
import com.labmineral.dto.request.CreateTestResultRequestDTO;
import com.labmineral.dto.response.EquipmentResponseDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.dto.response.TestResultResponseDTO;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class PengujianService {

    private final TestResultApiClient testResultApiClient;
    private final SampleApiClient sampleApiClient;
    private final EquipmentApiClient equipmentApiClient;

    public PengujianService(TestResultApiClient testResultApiClient,
                            SampleApiClient sampleApiClient,
                            EquipmentApiClient equipmentApiClient) {
        this.testResultApiClient = testResultApiClient;
        this.sampleApiClient = sampleApiClient;
        this.equipmentApiClient = equipmentApiClient;
    }

    public List<TestResultResponseDTO> getTestResults(String parameter, String kesimpulan, String metode, String search) {
        return testResultApiClient.getTestResults(1, 100, parameter, kesimpulan, metode, search);
    }

    public List<SampleResponseDTO> getAvailableSamples() {
        try {
            return sampleApiClient.getSamples(100);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public List<EquipmentResponseDTO> getAvailableEquipment() {
        try {
            var res = equipmentApiClient.getEquipment(1, 50, null, null, null, null);
            return res != null && res.data() != null ? res.data() : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void simpanHasilUji(CreateTestResultRequestDTO request) {
        testResultApiClient.createTestResult(request);
    }
}
