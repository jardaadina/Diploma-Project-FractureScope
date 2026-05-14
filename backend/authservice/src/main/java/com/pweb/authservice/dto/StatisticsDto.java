package com.pweb.authservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class StatisticsDto {

    private long totalAnalyses;
    private long fracturedCount;
    private double fractureRate;
    private String mostUsedModel;
    private double mostUsedModelPercent;
    private double averageConfidence;

    private List<NameValue> fractureTypes;

    private List<NameValue> anatomicalDistribution;

    private List<DateCount> dailyAnalyses;

    @Data
    public static class NameValue {
        private String name;
        private long value;

        public NameValue(String name, long value) {
            this.name = name;
            this.value = value;
        }
    }

    @Data
    public static class DateCount {
        private String date;
        private long count;

        public DateCount(String date, long count) {
            this.date = date;
            this.count = count;
        }
    }
}