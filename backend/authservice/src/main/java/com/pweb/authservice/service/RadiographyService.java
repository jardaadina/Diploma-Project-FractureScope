package com.pweb.authservice.service;

import com.pweb.authservice.dto.RadiographyDto;
import com.pweb.authservice.entity.AnalysisResult;
import com.pweb.authservice.entity.Radiography;
import com.pweb.authservice.entity.User;
import com.pweb.authservice.repository.AnalysisResultRepository;
import com.pweb.authservice.repository.RadiographyRepository;
import com.pweb.authservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class RadiographyService {

    @Autowired
    private RadiographyRepository radiographyRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AnalysisResultRepository analysisResultRepository;

    public RadiographyDto createRadiography(RadiographyDto dto) {
        User user = userRepository.findById(dto.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found!"));

        Radiography rad = new Radiography();
        rad.setUser(user);
        rad.setFilePath(dto.getFilePath());
        rad.setAnatomicRegion(dto.getAnatomicRegion());

        Radiography saved = radiographyRepository.save(rad);

        dto.setId(saved.getId());
        dto.setUploadDate(saved.getUploadDate());
        return dto;
    }

    public List<RadiographyDto> getRadiographiesByUser(Integer userId) {
        List<Radiography> radiographies = radiographyRepository.findByUserIdOrderByUploadDateDesc(userId);

        return radiographies.stream().map(rad -> {
            RadiographyDto dto = new RadiographyDto();
            dto.setId(rad.getId());
            dto.setUserId(rad.getUser().getId());
            dto.setFilePath(rad.getFilePath());
            dto.setAnatomicRegion(rad.getAnatomicRegion());
            dto.setUploadDate(rad.getUploadDate());

            Optional<AnalysisResult> analysisOpt =
                    analysisResultRepository.findFirstByRadiographyIdOrderByCreatedAtDesc(rad.getId());
            analysisOpt.ifPresent(a -> {
                dto.setHasFracture(a.getHasFracture());
                dto.setFractureType(a.getFractureType());
                dto.setModelType(a.getModelType());
                dto.setConfidence(a.getConfidence());
            });

            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional
    public void deleteRadiography(Integer id) {
        Radiography rad = radiographyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Radiography not found!"));

        List<AnalysisResult> analyses = analysisResultRepository.findByRadiographyId(id);
        for (AnalysisResult a : analyses) {
            if (a.getResultImagePath() != null) {
                try {
                    Files.deleteIfExists(Paths.get(a.getResultImagePath()));
                } catch (IOException e) {
                    System.err.println("Coudn't delete the image: " + a.getResultImagePath());
                }
            }
        }
        if (!analyses.isEmpty()) {
            analysisResultRepository.deleteAll(analyses);
        }

        try {
            if (rad.getFilePath() != null) {
                Files.deleteIfExists(Paths.get(rad.getFilePath()));
            }
        } catch (IOException e) {
            System.err.println("Coudn't delete the original file: " + rad.getFilePath());
        }

        radiographyRepository.deleteById(id);
    }

    public Path getRadiographyImagePath(Integer id) {
        Radiography rad = radiographyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Radiography not found!"));

        Optional<AnalysisResult> analysisOpt =
                analysisResultRepository.findFirstByRadiographyIdOrderByCreatedAtDesc(id);

        if (analysisOpt.isPresent() && analysisOpt.get().getResultImagePath() != null) {
            Path resultPath = Paths.get(analysisOpt.get().getResultImagePath());
            if (Files.exists(resultPath)) {
                return resultPath;
            }
        }

        return Paths.get(rad.getFilePath());
    }
}