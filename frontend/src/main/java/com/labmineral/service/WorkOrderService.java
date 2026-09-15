package com.labmineral.service;

import com.labmineral.client.api.WorkOrderApiClient;
import com.labmineral.dto.request.CreateWorkOrderRequestDTO;
import com.labmineral.dto.request.UpdateWorkOrderStatusRequestDTO;
import com.labmineral.dto.response.AvailableSampleDTO;
import com.labmineral.dto.response.BatchAntriDTO;
import com.labmineral.dto.response.WorkOrderResponseDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class WorkOrderService {

    private static final Logger log = LoggerFactory.getLogger(WorkOrderService.class);
    private final WorkOrderApiClient workOrderApiClient;

    public WorkOrderService(WorkOrderApiClient workOrderApiClient) {
        this.workOrderApiClient = workOrderApiClient;
    }

    public List<WorkOrderResponseDTO> getDaftarWorkOrder(String search, String fstatus) {
        List<WorkOrderResponseDTO> list = workOrderApiClient.getWorkOrders(1, 100, search, fstatus, null);

        // Filter status lokal jika filter adalah 'aktif_draft'
        if ("aktif_draft".equalsIgnoreCase(fstatus)) {
            list = list.stream()
                    .filter(w -> "aktif".equalsIgnoreCase(w.status()) || "draft".equalsIgnoreCase(w.status()))
                    .collect(Collectors.toList());
        }

        // Urutkan prioritas urgent > tinggi > normal, status aktif > draft > selesai > dibatalkan
        list.sort((a, b) -> {
            int priA = getPriorityWeight(a.prioritas());
            int priB = getPriorityWeight(b.prioritas());
            if (priA != priB) return Integer.compare(priB, priA);

            int stA = getStatusWeight(a.status());
            int stB = getStatusWeight(b.status());
            if (stA != stB) return Integer.compare(stB, stA);

            return Long.compare(b.id(), a.id());
        });

        // Enrich sample items for top 10 WOs to display chips without excessive requests
        List<WorkOrderResponseDTO> enriched = new ArrayList<>();
        int count = 0;
        for (WorkOrderResponseDTO wo : list) {
            if (count < 15 && (wo.workOrderSamples() == null || wo.workOrderSamples().isEmpty())) {
                try {
                    WorkOrderResponseDTO detail = workOrderApiClient.getWorkOrderById(wo.id());
                    if (detail != null && detail.workOrderSamples() != null) {
                        enriched.add(detail);
                        count++;
                        continue;
                    }
                } catch (Exception ignored) {}
            }
            enriched.add(wo);
            count++;
        }

        return enriched;
    }

    private int getPriorityWeight(String pri) {
        if (pri == null) return 1;
        return switch (pri.toLowerCase()) {
            case "urgent" -> 3;
            case "tinggi" -> 2;
            default -> 1;
        };
    }

    private int getStatusWeight(String st) {
        if (st == null) return 1;
        return switch (st.toLowerCase()) {
            case "aktif" -> 4;
            case "draft" -> 3;
            case "selesai" -> 2;
            default -> 1;
        };
    }

    public List<AvailableSampleDTO> getAvailableSamples() {
        return workOrderApiClient.getAvailableSamples();
    }

    public List<BatchAntriDTO> getPenerimaanAntri(List<AvailableSampleDTO> samples) {
        if (samples == null || samples.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, List<AvailableSampleDTO>> grouped = samples.stream()
                .filter(s -> s.penerimaanId() != null)
                .collect(Collectors.groupingBy(AvailableSampleDTO::penerimaanId, LinkedHashMap::new, Collectors.toList()));

        List<BatchAntriDTO> result = new ArrayList<>();
        for (Map.Entry<Long, List<AvailableSampleDTO>> entry : grouped.entrySet()) {
            Long recId = entry.getKey();
            List<AvailableSampleDTO> batchSamples = entry.getValue();
            AvailableSampleDTO first = batchSamples.get(0);

            String noPenerimaan = first.getNomorPenerimaan() != null ? first.getNomorPenerimaan() : "REC-" + recId;
            String klien = first.klien() != null ? first.klien() : "—";
            LocalDate tgl = first.tanggalMasuk() != null ? first.tanggalMasuk() : LocalDate.now();

            String materials = batchSamples.stream()
                    .map(AvailableSampleDTO::jenisMaterial)
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.joining(", "));

            String codes = batchSamples.stream()
                    .map(AvailableSampleDTO::kodeSampel)
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining(", "));

            result.add(new BatchAntriDTO(
                    recId,
                    noPenerimaan,
                    klien,
                    tgl,
                    batchSamples.size(),
                    materials,
                    codes,
                    batchSamples
            ));
        }

        return result;
    }

    public Map<String, Long> getStatistik(List<WorkOrderResponseDTO> all) {
        Map<String, Long> stats = new HashMap<>();
        long draft = all.stream().filter(w -> "draft".equalsIgnoreCase(w.status())).count();
        long aktif = all.stream().filter(w -> "aktif".equalsIgnoreCase(w.status())).count();
        long urgent = all.stream().filter(w -> "urgent".equalsIgnoreCase(w.prioritas()) && !"selesai".equalsIgnoreCase(w.status())).count();
        long selesai = all.stream().filter(w -> "selesai".equalsIgnoreCase(w.status())).count();

        stats.put("draft", draft);
        stats.put("aktif", aktif);
        stats.put("urgent", urgent);
        stats.put("selesai", selesai);
        return stats;
    }

    public List<WorkOrderResponseDTO> getJadwalInstrumen(List<WorkOrderResponseDTO> all) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime limit = now.plusDays(7);

        return all.stream()
                .filter(w -> ("aktif".equalsIgnoreCase(w.status()) || "draft".equalsIgnoreCase(w.status())))
                .filter(w -> w.jadwalMulai() != null && w.jadwalMulai().isBefore(limit))
                .sorted(Comparator.comparing(WorkOrderResponseDTO::jadwalMulai))
                .collect(Collectors.toList());
    }

    public void simpanWorkOrder(CreateWorkOrderRequestDTO request) {
        workOrderApiClient.createWorkOrder(request);
    }

    public void aktivasiWorkOrder(Long id) {
        workOrderApiClient.updateStatus(id, new UpdateWorkOrderStatusRequestDTO("aktif", null));
    }

    public void selesaikanWorkOrder(Long id) {
        workOrderApiClient.updateStatus(id, new UpdateWorkOrderStatusRequestDTO("selesai", null));
    }

    public void batalkanWorkOrder(Long id) {
        workOrderApiClient.updateStatus(id, new UpdateWorkOrderStatusRequestDTO("dibatalkan", null));
    }

    public String generateNextWoNumberPreview(List<WorkOrderResponseDTO> existing) {
        LocalDate now = LocalDate.now();
        String prefix = "WO-" + now.format(DateTimeFormatter.ofPattern("yyMM")) + "-";
        int maxSeq = 0;
        if (existing != null) {
            for (WorkOrderResponseDTO w : existing) {
                if (w.nomorWo() != null && w.nomorWo().startsWith(prefix)) {
                    String[] parts = w.nomorWo().split("-");
                    if (parts.length >= 3) {
                        try {
                            int seq = Integer.parseInt(parts[2]);
                            if (seq > maxSeq) maxSeq = seq;
                        } catch (NumberFormatException ignored) {}
                    }
                }
            }
        }
        return String.format("%s%03d", prefix, maxSeq + 1);
    }
}
