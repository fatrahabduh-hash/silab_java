package com.labmineral.controller;

import com.labmineral.client.api.SubmissionApiClient;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.util.*;

@Controller
@RequestMapping("/ssf")
public class SsfController {

    private final SubmissionApiClient submissionApiClient;

    private static final List<String> MATERIAL_OPTS = Arrays.asList(
            "Bijih Emas", "Nikel Laterit", "Tembaga", "Bauksit", "Bijih Besi", "Timbal/Seng", "Mangan", "Kromit", "Lainnya"
    );

    private static final List<String> METODE_OPTS = Arrays.asList(
            "AAS", "XRF", "ICP-OES", "Gravimetri", "Fire Assay", "Volumetri"
    );

    public SsfController(SubmissionApiClient submissionApiClient) {
        this.submissionApiClient = submissionApiClient;
    }

    @GetMapping
    public String ssfForm(
            @RequestParam(name = "sukses", required = false) String sukses,
            @RequestParam(name = "nomor", required = false) String nomor,
            Model model) {

        model.addAttribute("materialOpts", MATERIAL_OPTS);
        model.addAttribute("metodeOpts", METODE_OPTS);
        model.addAttribute("sukses", "1".equals(sukses));
        model.addAttribute("nomorSubmission", nomor);

        return "public/ssf";
    }

    @PostMapping("/simpan")
    public String simpan(
            @RequestParam("klien") String klien,
            @RequestParam("email") String email,
            @RequestParam(name = "kontak_person", required = false) String kontakPerson,
            @RequestParam(name = "telepon", required = false) String telepon,
            @RequestParam(name = "alamat", required = false) String alamat,
            @RequestParam(name = "po_referensi", required = false) String poReferensi,
            @RequestParam(name = "instruksi_khusus", required = false) String instruksiKhusus,
            @RequestParam("sample_material") List<String> sampleMaterial,
            @RequestParam(name = "sample_berat", required = false) List<Double> sampleBerat,
            @RequestParam(name = "sample_parameter", required = false) List<String> sampleParameter,
            @RequestParam(name = "sample_metode", required = false) List<String> sampleMetode,
            RedirectAttributes redirectAttributes) {

        if (klien == null || klien.isBlank() || email == null || email.isBlank()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Nama perusahaan dan email narahubung wajib diisi.");
            return "redirect:/ssf";
        }

        List<Map<String, Object>> sampleList = new ArrayList<>();
        for (int i = 0; i < sampleMaterial.size(); i++) {
            String mat = sampleMaterial.get(i);
            if (mat != null && !mat.isBlank()) {
                Map<String, Object> smp = new HashMap<>();
                smp.put("jenisMaterial", mat.trim());
                smp.put("beratGram", (sampleBerat != null && sampleBerat.size() > i) ? sampleBerat.get(i) : 100.0);
                smp.put("parameter", (sampleParameter != null && sampleParameter.size() > i) ? sampleParameter.get(i) : "Multi-Element");
                smp.put("metodeUji", (sampleMetode != null && sampleMetode.size() > i) ? sampleMetode.get(i) : "XRF");
                sampleList.add(smp);
            }
        }

        if (sampleList.isEmpty()) {
            redirectAttributes.addFlashAttribute("errorMessage", "Minimal satu rincian sampel uji wajib disertakan.");
            return "redirect:/ssf";
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("klien", klien.trim());
        payload.put("email", email.trim());
        payload.put("kontakPerson", kontakPerson != null ? kontakPerson.trim() : null);
        payload.put("telepon", telepon != null ? telepon.trim() : null);
        payload.put("alamat", alamat != null ? alamat.trim() : null);
        payload.put("poReferensi", poReferensi != null ? poReferensi.trim() : null);
        payload.put("instruksiKhusus", instruksiKhusus != null ? instruksiKhusus.trim() : null);
        payload.put("samples", sampleList);

        try {
            submissionApiClient.createSubmission(payload);
            return "redirect:/ssf?sukses=1&nomor=" + klien.trim();
        } catch (Exception e) {
            redirectAttributes.addFlashAttribute("errorMessage", "Gagal mengirim permohonan SSF: " + e.getMessage());
            return "redirect:/ssf";
        }
    }
}
