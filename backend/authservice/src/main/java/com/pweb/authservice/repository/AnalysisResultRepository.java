package com.pweb.authservice.repository;

import com.pweb.authservice.entity.AnalysisResult;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AnalysisResultRepository extends JpaRepository<AnalysisResult, Integer> {
    List<AnalysisResult> findByRadiographyId(Integer radiographyId);

    Optional<AnalysisResult> findFirstByRadiographyIdOrderByCreatedAtDesc(Integer radiographyId);
}