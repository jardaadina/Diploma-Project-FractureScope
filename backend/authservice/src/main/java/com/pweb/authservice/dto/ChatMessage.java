package com.pweb.authservice.dto;

import lombok.Data;

@Data
public class ChatMessage {
    private String role;
    private String content;
}