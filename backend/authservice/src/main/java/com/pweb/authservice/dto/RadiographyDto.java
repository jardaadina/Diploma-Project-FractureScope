package com.pweb.authservice.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class RadiographyDto {
    private Integer id;
    private Integer userId;
    private String filePath;
    private String anatomicRegion;
    private String medicalNotes;
    private LocalDateTime uploadDate;

    private Boolean hasFracture;
    private String fractureType;
    private String modelType;
    private Double confidence;
}