package com.pweb.authservice.service;

import com.pweb.authservice.entity.AnalysisResult;
import com.pweb.authservice.entity.Radiography;
import com.pweb.authservice.entity.User;
import com.pweb.authservice.repository.AnalysisResultRepository;
import com.pweb.authservice.repository.RadiographyRepository;
import com.pweb.authservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
public class AnalysisService {

    @Autowired
    private RadiographyRepository radiographyRepository;
    @Autowired
    private AnalysisResultRepository analysisResultRepository;
    @Autowired
    private UserRepository userRepository;

    private final String UPLOAD_DIR = "uploads/";
    private final String PYTHON_AI_URL = "http://localhost:8000/predict";

    public Map<String, Object> processAndAnalyze(MultipartFile file, String modelType, Integer userId) throws IOException {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User doesn't exists!"));

        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) Files.createDirectories(uploadPath);
        String fileName = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new ByteArrayResource(file.getBytes()) {
            @Override
            public String getFilename() { return file.getOriginalFilename(); }
        });
        body.add("model_type", modelType);

        HttpEntity<MultiValueMap<String, Object>> request = new HttpEntity<>(body, headers);
        ResponseEntity<Map> response = restTemplate.postForEntity(PYTHON_AI_URL, request, Map.class);
        Map<String, Object> aiData = response.getBody();

        System.out.println("=== RĂSPUNS DE LA PYTHON ===");
        System.out.println(aiData != null ? aiData.keySet() : "null");

        if (aiData == null || aiData.containsKey("detail")) {
            throw new RuntimeException("Eroare la procesarea AI-ului: " + aiData);
        }

        Radiography rad = new Radiography();
        rad.setUser(user);
        rad.setFilePath(filePath.toString());

        Object regionObj = aiData.get("anatomic_region");
        rad.setAnatomicRegion(regionObj != null ? regionObj.toString() : "Unknown");

        Radiography savedRad = radiographyRepository.save(rad);

        AnalysisResult analysis = new AnalysisResult();
        analysis.setRadiography(savedRad);
        analysis.setModelType(modelType);

        Object hasFractureObj = aiData.get("has_fracture");
        analysis.setHasFracture(hasFractureObj != null && (Boolean) hasFractureObj);

        Object fractureTypeObj = aiData.get("fracture_type");
        analysis.setFractureType(fractureTypeObj != null ? fractureTypeObj.toString() : null);

        Object confidenceObj = aiData.get("confidence");
        analysis.setConfidence(confidenceObj != null ? Double.valueOf(confidenceObj.toString()) : 0.0);

        Object detectionsObj = aiData.get("detections");
        analysis.setDetections(detectionsObj != null ? detectionsObj.toString() : "[]");

        Object resultB64 = aiData.get("result_image_base64");
        if (resultB64 != null) {
            try {
                byte[] decoded = Base64.getDecoder().decode((String) resultB64);
                String resultFileName = "result_" + UUID.randomUUID() + ".jpg";
                Path resultPath = uploadPath.resolve(resultFileName);
                Files.write(resultPath, decoded);
                analysis.setResultImagePath(resultPath.toString());
                System.out.println("[Analysis] Saved result image: " + resultPath);
            } catch (Exception e) {
                System.err.println("[Analysis] Coudn't save the image: " + e.getMessage());
            }
        }

        analysisResultRepository.save(analysis);

        aiData.put("radiography_id", savedRad.getId());
        aiData.put("analysis_id", analysis.getId());

        return aiData;
    }
}