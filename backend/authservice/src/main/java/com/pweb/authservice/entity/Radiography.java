package com.pweb.authservice.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "radiographies")
@Data
public class Radiography {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnore
    private User user;

    @Column(nullable = false)
    private String filePath;

    @Column(length = 50)
    private String anatomicRegion;

    @Column(name = "upload_date", updatable = false)
    private LocalDateTime uploadDate;

    @PrePersist
    protected void onCreate() {
        this.uploadDate = LocalDateTime.now();
    }
}