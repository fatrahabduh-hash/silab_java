package com.labmineral.dto.request;

import java.math.BigDecimal;
import java.time.LocalDate;

public record UpdateReagentRequestDTO(
    String nama,
    String satuan,
    BigDecimal stokMinimum,
    String supplier,
    @com.fasterxml.jackson.annotation.JsonFormat(shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @org.springframework.format.annotation.DateTimeFormat(pattern = "yyyy-MM-dd")
    LocalDate tanggalKadaluarsa
) {}
