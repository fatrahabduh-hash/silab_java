package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CreateWorkOrderRequestDTO(
    String nomorWo,
    String mode, // 'batch' or 'single'
    Long penerimaanId,
    List<Long> sampelIds,
    Long analisId,
    Long peralatanId,
    String parameter,
    String metode,
    String prioritas,
    String jadwalMulai,
    String jadwalSelesai,
    String statusAwal,
    String catatan
) {}
