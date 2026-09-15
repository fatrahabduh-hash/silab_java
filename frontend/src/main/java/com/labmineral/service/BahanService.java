package com.labmineral.service;

import com.labmineral.client.api.ReagentApiClient;
import com.labmineral.dto.request.CreateReagentRequestDTO;
import com.labmineral.dto.request.StockAdjustRequestDTO;
import com.labmineral.dto.request.UpdateReagentRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.ReagentResponseDTO;
import com.labmineral.dto.response.ReagentStatsDTO;
import com.labmineral.exception.ApiException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class BahanService {

    private static final Logger log = LoggerFactory.getLogger(BahanService.class);
    private final ReagentApiClient reagentApiClient;

    public BahanService(ReagentApiClient reagentApiClient) {
        this.reagentApiClient = reagentApiClient;
    }

    public List<ReagentResponseDTO> getDaftarBahan(String search, String statusStok) {
        try {
            ApiResponseWrapper<List<ReagentResponseDTO>> response = reagentApiClient.getReagents(1, 100, search, statusStok);
            if (response != null && response.data() != null) {
                return response.data();
            }
        } catch (Exception e) {
            log.error("Gagal memuat daftar bahan dari backend API: {}", e.getMessage());
            throw e;
        }
        return Collections.emptyList();
    }

    public ReagentStatsDTO getStatistikBahan() {
        try {
            ApiResponseWrapper<ReagentStatsDTO> response = reagentApiClient.getStats();
            if (response != null && response.data() != null) {
                return response.data();
            }
        } catch (Exception e) {
            log.warn("Gagal memuat statistik bahan dari backend API: {}", e.getMessage());
        }
        return new ReagentStatsDTO(0, 0, 0, 0, 0);
    }

    public ReagentResponseDTO getBahanById(Long id) {
        ApiResponseWrapper<ReagentResponseDTO> response = reagentApiClient.getReagentById(id);
        return response != null ? response.data() : null;
    }

    public void simpanBahan(CreateReagentRequestDTO request) {
        try {
            reagentApiClient.createReagent(request);
        } catch (ApiException e) {
            // Jika kode bahan sudah ada, coba lakukan penyesuaian stok masuk jika cocok dengan pola PHP
            log.warn("Gagal menambahkan bahan baru via backend: {}", e.getMessage());
            throw e;
        }
    }

    public void updateBahan(Long id, UpdateReagentRequestDTO request) {
        reagentApiClient.updateReagent(id, request);
    }

    public void adjustStok(Long id, StockAdjustRequestDTO request) {
        reagentApiClient.adjustStock(id, request);
    }

    public void hapusBahan(Long id) {
        reagentApiClient.deleteReagent(id);
    }
}
