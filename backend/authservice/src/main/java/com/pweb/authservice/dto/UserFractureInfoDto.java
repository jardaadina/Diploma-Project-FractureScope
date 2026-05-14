package com.pweb.authservice.dto;

import lombok.Data;

@Data
public class UserFractureInfoDto {
    private boolean hasAnyFracture;
    private String fractureType;
    private String anatomicRegion;
    private Long totalAnalyses;
    private Long fracturedCount;
}