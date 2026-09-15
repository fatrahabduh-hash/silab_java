package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonInclude;
import jakarta.validation.constraints.NotBlank;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CreateSampleReceiptRequestDTO(
    String nomorPenerimaan,

    @NotBlank(message = "Nama klien wajib diisi")
    String klien,

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    LocalDate tanggalTerima,

    String keterangan,

    List<CreateSampleItemDTO> samples
) {}
