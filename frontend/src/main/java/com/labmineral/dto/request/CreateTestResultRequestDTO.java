package com.labmineral.dto.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateTestResultRequestDTO(
        @JsonProperty("kodeUji")
        String kodeUji,

        @NotNull(message = "ID sampel wajib diisi")
        @JsonProperty("sampelId")
        Long sampelId,

        @JsonProperty("noReferensi")
        String noReferensi,

        @JsonProperty("preparasiId")
        Long preparasiId,

        @NotBlank(message = "Parameter uji wajib diisi")
        @JsonProperty("parameter")
        String parameter,

        @NotNull(message = "Nilai hasil uji wajib diisi")
        @JsonProperty("nilai")
        Double nilai,

        @JsonProperty("faktorPengenceran")
        Double faktorPengenceran,

        @JsonProperty("satuan")
        String satuan,

        @JsonProperty("faktorKonversi")
        Double faktorKonversi,

        @JsonProperty("batasMin")
        Double batasMin,

        @JsonProperty("batasMaks")
        Double batasMaks,

        @JsonProperty("metode")
        String metode,

        @JsonProperty("alatId")
        Long alatId,

        @JsonProperty("analisId")
        Long analisId,

        @JsonProperty("kesimpulan")
        String kesimpulan,

        @JsonProperty("catatan")
        String catatan,

        @JsonProperty("tanggalUji")
        String tanggalUji
) {}
