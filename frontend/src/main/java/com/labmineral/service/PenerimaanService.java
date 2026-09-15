package com.labmineral.service;

import com.labmineral.client.api.SampleApiClient;
import com.labmineral.dto.request.CreateSampleReceiptRequestDTO;
import com.labmineral.dto.request.UpdateReceiptStatusRequestDTO;
import com.labmineral.dto.response.SampleReceiptResponseDTO;
import com.labmineral.dto.response.SampleResponseDTO;
import com.labmineral.dto.response.SubmissionSummaryDTO;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PenerimaanService {

    private static final Logger log = LoggerFactory.getLogger(PenerimaanService.class);
    private final SampleApiClient sampleApiClient;

    public PenerimaanService(SampleApiClient sampleApiClient) {
        this.sampleApiClient = sampleApiClient;
    }

    public List<SampleReceiptResponseDTO> getDaftarPenerimaan(String search, String status) {
        try {
            List<SampleReceiptResponseDTO> receipts = sampleApiClient.getReceipts(1, 100, search, status);
            List<SampleResponseDTO> allSamples = sampleApiClient.getSamples(100);

            Map<Long, List<SampleResponseDTO>> samplesByReceipt = allSamples.stream()
                    .filter(s -> s.penerimaanId() != null)
                    .collect(Collectors.groupingBy(SampleResponseDTO::penerimaanId));

            List<SampleReceiptResponseDTO> enriched = new ArrayList<>();
            for (SampleReceiptResponseDTO r : receipts) {
                List<SampleResponseDTO> batchSamples = samplesByReceipt.getOrDefault(r.id(), Collections.emptyList());
                enriched.add(new SampleReceiptResponseDTO(
                        r.id(),
                        r.nomorPenerimaan(),
                        r.klien(),
                        r.tanggalTerima(),
                        r.jumlahSampel(),
                        r.jenisMaterial(),
                        r.metodeUji(),
                        r.keterangan(),
                        r.status(),
                        r.isConfirmed(),
                        r.creator(),
                        r._count(),
                        batchSamples,
                        r.createdAt()
                ));
            }
            return enriched;
        } catch (Exception e) {
            log.error("Gagal mengambil daftar penerimaan sampel: {}", e.getMessage());
            throw e;
        }
    }

    public List<SubmissionSummaryDTO> getSubmissionsSiapProses() {
        return sampleApiClient.getApprovedSubmissions();
    }

    public void simpanPenerimaan(CreateSampleReceiptRequestDTO request) {
        sampleApiClient.createReceipt(request);
    }

    public void updateStatus(Long id, String status) {
        sampleApiClient.updateReceiptStatus(id, new UpdateReceiptStatusRequestDTO(status, null));
    }

    public void prosesSubmission(Long id) {
        sampleApiClient.convertSubmission(id);
    }

    public String generateNextReceiptNumberPreview(List<SampleReceiptResponseDTO> existing) {
        LocalDate now = LocalDate.now();
        String prefix = "REC-" + now.format(DateTimeFormatter.ofPattern("yyMM")) + "-";
        int maxSeq = 0;
        if (existing != null) {
            for (SampleReceiptResponseDTO r : existing) {
                if (r.nomorPenerimaan() != null && r.nomorPenerimaan().startsWith(prefix)) {
                    String[] parts = r.nomorPenerimaan().split("-");
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
