package com.pweb.authservice.repository;

import com.pweb.authservice.entity.Radiography;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RadiographyRepository extends JpaRepository<Radiography, Integer> {
    List<Radiography> findByUserIdOrderByUploadDateDesc(Integer userId);
}