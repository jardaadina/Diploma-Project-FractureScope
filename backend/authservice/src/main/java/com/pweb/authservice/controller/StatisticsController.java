package com.pweb.authservice.controller;

import com.pweb.authservice.dto.StatisticsDto;
import com.pweb.authservice.dto.UserFractureInfoDto;
import com.pweb.authservice.service.StatisticsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/statistics")
@CrossOrigin(origins = "*")
public class StatisticsController {

    @Autowired
    private StatisticsService statisticsService;

    @GetMapping("/global")
    public ResponseEntity<StatisticsDto> getGlobalStats() {
        return ResponseEntity.ok(statisticsService.getGlobalStatistics());
    }

    @GetMapping("/user/{userId}/fracture-info")
    public ResponseEntity<UserFractureInfoDto> getUserFractureInfo(@PathVariable Integer userId) {
        return ResponseEntity.ok(statisticsService.getUserFractureInfo(userId));
    }
}