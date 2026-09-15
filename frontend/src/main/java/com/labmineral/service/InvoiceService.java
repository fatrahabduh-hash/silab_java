package com.labmineral.service;

import com.labmineral.client.api.InvoiceApiClient;
import com.labmineral.client.api.SampleApiClient;
import com.labmineral.dto.request.CreateInvoiceRequestDTO;
import com.labmineral.dto.response.InvoiceResponseDTO;
import com.labmineral.dto.response.InvoiceStatsDTO;
import com.labmineral.dto.response.SampleReceiptResponseDTO;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
public class InvoiceService {

    private final InvoiceApiClient invoiceApiClient;
    private final SampleApiClient sampleApiClient;

    public InvoiceService(InvoiceApiClient invoiceApiClient, SampleApiClient sampleApiClient) {
        this.invoiceApiClient = invoiceApiClient;
        this.sampleApiClient = sampleApiClient;
    }

    public List<InvoiceResponseDTO> getInvoices(String status, String search) {
        return invoiceApiClient.getInvoices(1, 100, status, search);
    }

    public InvoiceStatsDTO getStats() {
        try {
            var res = invoiceApiClient.getStats();
            if (res != null && res.data() != null) {
                return res.data();
            }
        } catch (Exception ignored) {}
        return new InvoiceStatsDTO(0.0, 0.0, 0.0, Map.of("draft", 0L, "diterbitkan", 0L, "lunas", 0L, "dibatalkan", 0L));
    }

    public List<SampleReceiptResponseDTO> getAvailableReceipts() {
        try {
            return sampleApiClient.getReceipts(1, 50, null, null);
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    public void simpanInvoice(CreateInvoiceRequestDTO request) {
        invoiceApiClient.createInvoice(request);
    }

    public void updateStatus(Long id, String status, String catatan) {
        invoiceApiClient.updateStatus(id, status, catatan);
    }
}
