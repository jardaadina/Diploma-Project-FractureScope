package com.pweb.authservice.controller;

import com.pweb.authservice.dto.RadiographyDto;
import com.pweb.authservice.service.AnalysisService;
import com.pweb.authservice.service.RadiographyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/radiographies")
@CrossOrigin(origins = "*")
public class RadiographyController {

    @Autowired
    private RadiographyService radiographyService;
    @Autowired
    private AnalysisService analysisService;

    @PostMapping("/upload")
    public ResponseEntity<?> uploadAndAnalyze(
            @RequestParam("file") MultipartFile file,
            @RequestParam("model") String model,
            @RequestParam("userId") Integer userId) {
        try {
            Map<String, Object> result = analysisService.processAndAnalyze(file, model, userId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error to upload/analyze: " + e.getMessage());
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RadiographyDto>> getRadiographiesByUser(@PathVariable Integer userId) {
        return ResponseEntity.ok(radiographyService.getRadiographiesByUser(userId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRadiography(@PathVariable Integer id) {
        try {
            radiographyService.deleteRadiography(id);
            return ResponseEntity.ok("Radiography deleted succesuflly!");
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> getRadiographyImage(@PathVariable Integer id) {
        try {
            Path filePath = radiographyService.getRadiographyImagePath(id);
            Resource resource = new UrlResource(filePath.toUri());

            if (!resource.exists() || !resource.isReadable()) {
                return ResponseEntity.notFound().build();
            }

            String contentType = Files.probeContentType(filePath);
            if (contentType == null) {
                contentType = "image/jpeg";
            }

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}