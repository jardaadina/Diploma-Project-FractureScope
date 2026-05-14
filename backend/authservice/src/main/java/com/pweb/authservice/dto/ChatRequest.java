package com.pweb.authservice.dto;

import lombok.Data;
import java.util.List;

@Data
public class ChatRequest {
    private Integer userId;
    private List<ChatMessage> history;
}