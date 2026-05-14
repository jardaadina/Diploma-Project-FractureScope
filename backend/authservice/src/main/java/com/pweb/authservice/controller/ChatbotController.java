package com.pweb.authservice.controller;

import com.pweb.authservice.dto.ChatRequest;
import com.pweb.authservice.service.ChatbotService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/chatbot")
@CrossOrigin(origins = "*")
public class ChatbotController {

    @Autowired
    private ChatbotService chatbotService;

    @PostMapping("/ask")
    public ResponseEntity<?> ask(@RequestBody ChatRequest request) {
        try {
            String reply = chatbotService.askChatbot(request);
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("reply", "Chatbot error: " + e.getMessage()));
        }
    }
}