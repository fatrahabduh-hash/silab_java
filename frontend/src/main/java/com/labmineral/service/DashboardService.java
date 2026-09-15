package com.labmineral.service;

import com.labmineral.client.api.EquipmentApiClient;
import com.labmineral.client.api.ReagentApiClient;
import com.labmineral.client.api.SampleApiClient;
import com.labmineral.client.api.WorkOrderApiClient;
import com.labmineral.dto.response.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.*;

@Service
public class DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);

    private final SampleApiClient sampleApiClient;
    private final WorkOrderApiClient workOrderApiClient;
    private final EquipmentApiClient equipmentApiClient;
    private final ReagentApiClient reagentApiClient;

    public DashboardService(SampleApiClient sampleApiClient,
                            WorkOrderApiClient workOrderApiClient,
                            EquipmentApiClient equipmentApiClient,
                            ReagentApiClient reagentApiClient) {
        this.sampleApiClient = sampleApiClient;
        this.workOrderApiClient = workOrderApiClient;
        this.equipmentApiClient = equipmentApiClient;
        this.reagentApiClient = reagentApiClient;
    }

    public Map<String, Object> getDashboardData() {
        Map<String, Object> data = new HashMap<>();

        // Sapaan waktu
        LocalTime now = LocalTime.now();
        int hour = now.getHour();
        String sapaan = (hour < 11) ? "Pagi" : (hour < 15) ? "Siang" : (hour < 18) ? "Sore" : "Malam";
        data.put("sapaan", sapaan);

        // 1. Sampel & Penerimaan
        List<SampleReceiptResponseDTO> recentReceipts = Collections.emptyList();
        try {
            recentReceipts = sampleApiClient.getReceipts(1, 6, null, null);
        } catch (Exception e) {
            log.warn("Dashboard gagal ambil data penerimaan: {}", e.getMessage());
        }
        data.put("recentReceipts", recentReceipts);

        List<SampleResponseDTO> samples = Collections.emptyList();
        try {
            samples = sampleApiClient.getSamples(100);
        } catch (Exception e) {
            log.warn("Dashboard gagal ambil sampel: {}", e.getMessage());
        }

        long sampleTotal = samples.size();
        long sampleSelesai = samples.stream()
                .filter(s -> "selesai".equalsIgnoreCase(s.status()))
                .count();
        long sampleAktif = sampleTotal - sampleSelesai;
        long pctSelesai = sampleTotal > 0 ? Math.round((double) sampleSelesai / sampleTotal * 100) : 0;

        data.put("sampleTotal", sampleTotal);
        data.put("sampleAktif", sampleAktif);
        data.put("sampleSelesai", sampleSelesai);
        data.put("pctSelesai", pctSelesai);

        // 2. Reagen & Bahan
        List<ReagentResponseDTO> alertBahan = new ArrayList<>();
        long totalKritis = 0;
        try {
            var rStatsWrapper = reagentApiClient.getStats();
            if (rStatsWrapper != null && rStatsWrapper.data() != null) {
                totalKritis = rStatsWrapper.data().stokKritis();
            }
            var reagentsWrapper = reagentApiClient.getReagents(1, 50, null, null);
            if (reagentsWrapper != null && reagentsWrapper.data() != null) {
                for (ReagentResponseDTO r : reagentsWrapper.data()) {
                    if ("kritis".equalsIgnoreCase(r.getStatusStokBadge()) || "rendah".equalsIgnoreCase(r.getStatusStokBadge())) {
                        alertBahan.add(r);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Dashboard gagal ambil reagen: {}", e.getMessage());
        }
        data.put("alertBahan", alertBahan.stream().limit(5).toList());
        data.put("totalKritis", totalKritis > 0 ? totalKritis : alertBahan.size());

        // 3. Peralatan Lab
        List<EquipmentResponseDTO> alatUtama = Collections.emptyList();
        List<EquipmentResponseDTO> alatMasalah = new ArrayList<>();
        try {
            var eqResponse = equipmentApiClient.getEquipment(1, 20, null, null, null, null);
            if (eqResponse != null && eqResponse.data() != null) {
                alatUtama = eqResponse.data();
                for (EquipmentResponseDTO eq : alatUtama) {
                    if ("maintenance".equalsIgnoreCase(eq.status()) || "rusak".equalsIgnoreCase(eq.status())) {
                        alatMasalah.add(eq);
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Dashboard gagal ambil peralatan: {}", e.getMessage());
        }
        data.put("alatUtama", alatUtama.stream().limit(6).toList());
        data.put("alatMasalah", alatMasalah);
        data.put("totalAlatMasalah", alatMasalah.size());

        // 4. Work Order Aktif
        List<WorkOrderResponseDTO> activeWo = Collections.emptyList();
        try {
            activeWo = workOrderApiClient.getWorkOrders(1, 6, null, "aktif", null);
        } catch (Exception e) {
            log.warn("Dashboard gagal ambil work order: {}", e.getMessage());
        }
        data.put("activeWo", activeWo);
        data.put("totalWoAktif", activeWo.size());

        // Total Alert
        long totalAlert = totalKritis + alatMasalah.size();
        data.put("alertCount", totalAlert);

        return data;
    }
}
