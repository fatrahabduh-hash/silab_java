package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

public record CreateEquipmentRequestDTO(
    @NotBlank(message = "Kode alat wajib diisi")
    @Size(min = 2, max = 20, message = "Kode alat antara 2 hingga 20 karakter")
    String kodeAlat,

    @NotBlank(message = "Nama peralatan wajib diisi")
    @Size(min = 2, max = 150, message = "Nama peralatan antara 2 hingga 150 karakter")
    String nama,

    @Size(max = 100, message = "Lokasi maksimal 100 karakter")
    String lokasi,

    @Pattern(regexp = "^(tersedia|digunakan|maintenance|rusak)?$", message = "Status tidak valid")
    String status,

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    LocalDate tanggalKalibrasi,

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    LocalDate masaBerlakuKalibrasi,

    @PositiveOrZero(message = "Jam pakai tidak boleh negatif")
    Integer jamPakai,

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    @DateTimeFormat(pattern = "yyyy-MM-dd")
    LocalDate jadwalMaintenance,

    @Size(max = 100, message = "PIC maksimal 100 karakter")
    String pic,

    String catatan
) {}
