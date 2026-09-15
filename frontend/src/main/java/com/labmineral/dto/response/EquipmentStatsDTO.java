package com.labmineral.dto.response;

public record EquipmentStatsDTO(
    int total,
    int tersedia,
    int digunakan,
    int maintenance,
    int rusak,
    int kalibrasiKadaluarsa,
    int kalibrasiSegera
) {}
