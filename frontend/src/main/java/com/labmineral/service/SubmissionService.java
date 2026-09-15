package com.labmineral.service;

import com.labmineral.client.api.SubmissionApiClient;
import com.labmineral.dto.response.SubmissionResponseDTO;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SubmissionService {

    private final SubmissionApiClient submissionApiClient;

    public SubmissionService(SubmissionApiClient submissionApiClient) {
        this.submissionApiClient = submissionApiClient;
    }

    public List<SubmissionResponseDTO> getSubmissions(String status, String search) {
        return submissionApiClient.getSubmissions(1, 50, status, search);
    }

    public void updateStatus(Long id, String status, String catatan) {
        submissionApiClient.updateStatus(id, status, catatan);
    }

    public void convertToReceipt(Long id) {
        submissionApiClient.convertToReceipt(id);
    }
}
