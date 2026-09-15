package com.labmineral.service;

import com.labmineral.client.api.EquipmentApiClient;
import com.labmineral.dto.request.CreateEquipmentRequestDTO;
import com.labmineral.dto.request.LogEquipmentUsageRequestDTO;
import com.labmineral.dto.request.UpdateEquipmentStatusRequestDTO;
import com.labmineral.dto.response.ApiResponseWrapper;
import com.labmineral.dto.response.EquipmentResponseDTO;
import com.labmineral.dto.response.EquipmentScheduleDTO;
import com.labmineral.dto.response.EquipmentStatsDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

@Service
public class PeralatanService {

    private static final Logger log = LoggerFactory.getLogger(PeralatanService.class);
    private final EquipmentApiClient equipmentApiClient;

    public PeralatanService(EquipmentApiClient equipmentApiClient) {
        this.equipmentApiClient = equipmentApiClient;
    }

    public List<EquipmentResponseDTO> getDaftarPeralatan(String search, String status, String kalibrasiStatus) {
        try {
            ApiResponseWrapper<List<EquipmentResponseDTO>> response = equipmentApiClient.getEquipment(
                    1, 100, status, search, null, kalibrasiStatus
            );
            if (response != null && response.data() != null) {
                return response.data();
            }
        } catch (Exception e) {
            log.error("Gagal memuat daftar peralatan dari backend API: {}", e.getMessage());
            throw e;
        }
        return Collections.emptyList();
    }

    public EquipmentStatsDTO getStatistikPeralatan() {
        try {
            ApiResponseWrapper<EquipmentStatsDTO> response = equipmentApiClient.getStats();
            if (response != null && response.data() != null) {
                return response.data();
            }
        } catch (Exception e) {
            log.warn("Gagal memuat statistik peralatan dari backend API: {}", e.getMessage());
        }
        return new EquipmentStatsDTO(0, 0, 0, 0, 0, 0, 0);
    }

    public List<EquipmentScheduleDTO> getJadwalPeralatan(List<EquipmentResponseDTO> all) {
        if (all == null || all.isEmpty()) {
            return Collections.emptyList();
        }

        LocalDate today = LocalDate.now();
        List<EquipmentScheduleDTO> schedules = new ArrayList<>();

        for (EquipmentResponseDTO item : all) {
            // Cek jadwal maintenance
            if (item.jadwalMaintenance() != null) {
                long days = ChronoUnit.DAYS.between(today, item.jadwalMaintenance());
                String badge = days <= 3 ? "kritis" : (days <= 7 ? "rendah" : "aman");
                schedules.add(new EquipmentScheduleDTO(
                        item.nama(),
                        item.kodeAlat(),
                        "Maintenance",
                        item.jadwalMaintenance(),
                        item.pic() != null ? item.pic() : "—",
                        badge,
                        days
                ));
            }

            // Cek masa berlaku kalibrasi <= 30 hari mendatang atau sudah kadaluarsa
            if (item.masaBerlakuKalibrasi() != null) {
                long days = ChronoUnit.DAYS.between(today, item.masaBerlakuKalibrasi());
                if (days <= 30) {
                    String badge = days <= 3 ? "kritis" : (days <= 7 ? "rendah" : "aman");
                    schedules.add(new EquipmentScheduleDTO(
                            item.nama(),
                            item.kodeAlat(),
                            "Kalibrasi",
                            item.masaBerlakuKalibrasi(),
                            item.pic() != null ? item.pic() : "—",
                            badge,
                            days
                    ));
                }
            }
        }

        // Urutkan berdasarkan tanggal terdekat, ambil maksimal 8 jadwal
        schedules.sort(Comparator.comparing(EquipmentScheduleDTO::tanggal));
        if (schedules.size() > 8) {
            return schedules.subList(0, 8);
        }
        return schedules;
    }

    public EquipmentResponseDTO getPeralatanById(Long id) {
        ApiResponseWrapper<EquipmentResponseDTO> response = equipmentApiClient.getEquipmentById(id);
        return response != null ? response.data() : null;
    }

    public void simpanPeralatan(CreateEquipmentRequestDTO request) {
        equipmentApiClient.createEquipment(request);
    }

    public void updateStatus(Long id, String status) {
        equipmentApiClient.updateStatus(id, new UpdateEquipmentStatusRequestDTO(status));
    }

    public void logPemakaian(Long id, Integer tambahanJam, String catatan) {
        equipmentApiClient.logUsage(id, new LogEquipmentUsageRequestDTO(tambahanJam, catatan));
    }

    public void hapusPeralatan(Long id) {
        equipmentApiClient.deleteEquipment(id);
    }
}
