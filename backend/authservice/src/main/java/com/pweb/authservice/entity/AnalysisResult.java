package com.pweb.authservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "analysis_results")
@Data
public class AnalysisResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "radiography_id", nullable = false)
    @JsonIgnore
    private Radiography radiography;

    private String modelType;
    private Double confidence;
    private Boolean hasFracture;
    private String fractureType;

    @Column(columnDefinition = "TEXT")
    private String detections;

    @Column(length = 500)
    private String resultImagePath;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}