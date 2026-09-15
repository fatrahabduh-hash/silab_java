package com.labmineral.dto.response;

public record ReagentStatsDTO(
    int totalItem,
    int stokKritis,
    int stokAman,
    int kadaluarsa,
    int kadaluarsaSegera
) {}
