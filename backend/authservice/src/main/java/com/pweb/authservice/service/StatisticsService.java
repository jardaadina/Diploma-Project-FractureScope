package com.pweb.authservice.service;

import com.pweb.authservice.dto.StatisticsDto;
import com.pweb.authservice.dto.UserFractureInfoDto;
import com.pweb.authservice.entity.AnalysisResult;
import com.pweb.authservice.entity.Radiography;
import com.pweb.authservice.repository.AnalysisResultRepository;
import com.pweb.authservice.repository.RadiographyRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class StatisticsService {

    @Autowired
    private AnalysisResultRepository analysisResultRepository;

    @Autowired
    private RadiographyRepository radiographyRepository;

    public StatisticsDto getGlobalStatistics() {
        StatisticsDto dto = new StatisticsDto();

        List<AnalysisResult> allAnalyses = analysisResultRepository.findAll();
        List<Radiography> allRads = radiographyRepository.findAll();

        long total = allAnalyses.size();
        long fractured = allAnalyses.stream()
                .filter(a -> Boolean.TRUE.equals(a.getHasFracture()))
                .count();

        dto.setTotalAnalyses(total);
        dto.setFracturedCount(fractured);
        dto.setFractureRate(total > 0 ? (fractured * 100.0 / total) : 0.0);

        Map<String, Long> modelCounts = allAnalyses.stream()
                .filter(a -> a.getModelType() != null)
                .collect(Collectors.groupingBy(AnalysisResult::getModelType, Collectors.counting()));

        if (!modelCounts.isEmpty()) {
            Map.Entry<String, Long> top = modelCounts.entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .orElse(null);
            if (top != null) {
                dto.setMostUsedModel(top.getKey());
                dto.setMostUsedModelPercent(total > 0 ? (top.getValue() * 100.0 / total) : 0.0);
            }
        } else {
            dto.setMostUsedModel("N/A");
            dto.setMostUsedModelPercent(0.0);
        }

        OptionalDouble avgConf = allAnalyses.stream()
                .filter(a -> Boolean.TRUE.equals(a.getHasFracture()) && a.getConfidence() != null)
                .mapToDouble(AnalysisResult::getConfidence)
                .average();
        dto.setAverageConfidence(avgConf.isPresent() ? avgConf.getAsDouble() * 100.0 : 0.0);

        Map<String, Long> fractureTypeCounts = allAnalyses.stream()
                .filter(a -> a.getFractureType() != null && !a.getFractureType().isBlank())
                .collect(Collectors.groupingBy(AnalysisResult::getFractureType, Collectors.counting()));

        List<StatisticsDto.NameValue> fractureTypesList = fractureTypeCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(e -> new StatisticsDto.NameValue(translateFractureType(e.getKey()), e.getValue()))
                .collect(Collectors.toList());
        dto.setFractureTypes(fractureTypesList);

        Map<String, Long> regionCounts = allRads.stream()
                .filter(r -> r.getAnatomicRegion() != null && !r.getAnatomicRegion().isBlank())
                .collect(Collectors.groupingBy(Radiography::getAnatomicRegion, Collectors.counting()));

        List<StatisticsDto.NameValue> anatomicalList = regionCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .map(e -> new StatisticsDto.NameValue(e.getKey(), e.getValue()))
                .collect(Collectors.toList());
        dto.setAnatomicalDistribution(anatomicalList);

        List<StatisticsDto.DateCount> daily = buildLast15Days(allAnalyses);
        dto.setDailyAnalyses(daily);

        return dto;
    }

    public UserFractureInfoDto getUserFractureInfo(Integer userId) {
        UserFractureInfoDto dto = new UserFractureInfoDto();

        List<Radiography> userRads = radiographyRepository.findByUserIdOrderByUploadDateDesc(userId);

        long totalAnalyses = 0;
        long fracturedCount = 0;
        String mostRecentFractureType = null;
        String mostRecentRegion = null;

        for (Radiography rad : userRads) {
            Optional<AnalysisResult> aOpt = analysisResultRepository
                    .findFirstByRadiographyIdOrderByCreatedAtDesc(rad.getId());
            if (aOpt.isPresent()) {
                totalAnalyses++;
                AnalysisResult a = aOpt.get();
                if (Boolean.TRUE.equals(a.getHasFracture())) {
                    fracturedCount++;
                    if (mostRecentFractureType == null && a.getFractureType() != null) {
                        mostRecentFractureType = a.getFractureType();
                        mostRecentRegion = rad.getAnatomicRegion();
                    }
                }
            }
        }

        dto.setTotalAnalyses(totalAnalyses);
        dto.setFracturedCount(fracturedCount);
        dto.setHasAnyFracture(mostRecentFractureType != null);
        dto.setFractureType(mostRecentFractureType);
        dto.setAnatomicRegion(mostRecentRegion);

        return dto;
    }

    private List<StatisticsDto.DateCount> buildLast15Days(List<AnalysisResult> allAnalyses) {
        DateTimeFormatter shortFmt = DateTimeFormatter.ofPattern("dd MMM");
        Map<LocalDate, Long> dayMap = new LinkedHashMap<>();
        LocalDate today = LocalDate.now();
        for (int i = 14; i >= 0; i--) {
            dayMap.put(today.minusDays(i), 0L);
        }

        for (AnalysisResult a : allAnalyses) {
            if (a.getCreatedAt() == null) continue;
            LocalDate d = a.getCreatedAt().toLocalDate();
            if (dayMap.containsKey(d)) {
                dayMap.put(d, dayMap.get(d) + 1);
            }
        }

        return dayMap.entrySet().stream()
                .map(e -> new StatisticsDto.DateCount(e.getKey().format(shortFmt), e.getValue()))
                .collect(Collectors.toList());
    }

    private String translateFractureType(String englishName) {
        if (englishName == null) return "Unknown";
        switch (englishName) {
            case "Avulsion fracture":      return "Avulsion fracture";
            case "Comminuted fracture":    return "Comminuted fracture";
            case "Fracture Dislocation":   return "Fracture Dislocation";
            case "Greenstick fracture":    return "Greenstick fracture";
            case "Hairline Fracture":      return "Hairline Fracture";
            case "Impacted fracture":      return "Impacted fracture";
            case "Longitudinal fracture":  return "Longitudinal fracture";
            case "Oblique fracture":       return "Oblique fracture";
            case "Pathological fracture":  return "Pathological fracture";
            case "Spiral Fracture":        return "Spiral Fracture";
            default:                       return englishName;
        }
    }
}