package com.labmineral.dto.response;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record TestResultResponseDTO(
        @JsonProperty("id")
        Long id,

        @JsonProperty("kodeUji")
        String kodeUji,

        @JsonProperty("sampelId")
        Long sampelId,

        @JsonProperty("preparasiId")
        Long preparasiId,

        @JsonProperty("parameter")
        String parameter,

        @JsonProperty("nilai")
        Double nilai,

        @JsonProperty("faktorPengenceran")
        Double faktorPengenceran,

        @JsonProperty("satuan")
        String satuan,

        @JsonProperty("faktorKonversi")
        Double faktorKonversi,

        @JsonProperty("nilaiTerkoreksi")
        Double nilaiTerkoreksi,

        @JsonProperty("batasMin")
        Double batasMin,

        @JsonProperty("batasMaks")
        Double batasMaks,

        @JsonProperty("kesimpulan")
        String kesimpulan,

        @JsonProperty("metode")
        String metode,

        @JsonProperty("alatId")
        Long alatId,

        @JsonProperty("analisId")
        Long analisId,

        @JsonProperty("catatan")
        String catatan,

        @JsonProperty("tanggalUji")
        String tanggalUji,

        @JsonProperty("createdAt")
        String createdAt,

        @JsonProperty("sample")
        SampleRefDTO sample,

        @JsonProperty("equipment")
        EquipmentRefDTO equipment,

        @JsonProperty("analyst")
        AnalystRefDTO analyst
) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SampleRefDTO(
            Long id,
            String kodeSampel,
            String jenisMaterial,
            String klien,
            PenerimaanRefDTO penerimaan
    ) {
        @JsonIgnoreProperties(ignoreUnknown = true)
        public record PenerimaanRefDTO(
                Long id,
                String nomorPenerimaan
        ) {}
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EquipmentRefDTO(
            Long id,
            String kodeAlat,
            String nama
    ) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record AnalystRefDTO(
            Long id,
            String nama,
            String username
    ) {}
}
