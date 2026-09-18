package com.pweb.authservice.service;

import com.pweb.authservice.dto.ChatMessage;
import com.pweb.authservice.dto.ChatRequest;
import com.pweb.authservice.dto.RadiographyDto;
import com.pweb.authservice.entity.User;
import com.pweb.authservice.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ChatbotService {

    @Value("${groq.api.key:}")
    private String groqApiKey;

    @Value("${groq.api.url:https://api.groq.com/openai/v1/chat/completions}")
    private String groqApiUrl;

    @Value("${groq.api.model:llama-3.3-70b-versatile}")
    private String groqModel;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RadiographyService radiographyService;

    public String askChatbot(ChatRequest request) {
        if (groqApiKey == null || groqApiKey.isBlank()) {
            return "Eroare de configurare a serverului / Server configuration error. (GROQ_API_KEY missing)";
        }
        if (request.getHistory() == null || request.getHistory().isEmpty()) {
            return "Nu am primit niciun mesaj de la tine. / No message received from you.";
        }

        String systemPrompt = buildSystemPrompt(request.getUserId());

        List<Map<String, String>> messages = new ArrayList<>();
        Map<String, String> systemMsg = new HashMap<>();
        systemMsg.put("role", "system");
        systemMsg.put("content", systemPrompt);
        messages.add(systemMsg);

        for (ChatMessage m : request.getHistory()) {
            Map<String, String> msg = new HashMap<>();
            msg.put("role", m.getRole());
            msg.put("content", m.getContent());
            messages.add(msg);
        }

        Map<String, Object> body = new HashMap<>();
        body.put("model", groqModel);
        body.put("messages", messages);
        body.put("temperature", 0.5);
        body.put("max_tokens", 700);

        try {
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(groqApiKey);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(groqApiUrl, entity, Map.class);

            Map<String, Object> respBody = response.getBody();
            if (respBody == null || !respBody.containsKey("choices")) {
                return "Răspunsul de la AI a venit gol. Mai încearcă, te rog. / AI response was empty. Please try again.";
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) respBody.get("choices");
            if (choices.isEmpty()) {
                return "Răspunsul de la AI nu conține mesaje. / AI response contains no messages.";
            }

            Map<String, Object> messageObj = (Map<String, Object>) choices.get(0).get("message");
            return (String) messageObj.get("content");

        } catch (Exception e) {
            e.printStackTrace();
            return "Eroare la apelul către serviciul AI / Error calling AI service: " + e.getMessage();
        }
    }

    private String buildSystemPrompt(Integer userId) {
        StringBuilder sb = new StringBuilder();

        sb.append("Ești Dr. Scope, asistent virtual medical al aplicației FractureScope. ");
        sb.append("FractureScope este o platformă AI care detectează și clasifică fracturi din radiografii ")
                .append("folosind modele de deep learning (UNet, YOLOv8, EfficientNet, Random Forest). ")
                .append("Tipurile de fracturi detectate de aplicație sunt: Avulsion, Comminuted, Fracture Dislocation, ")
                .append("Greenstick, Hairline, Impacted, Longitudinal, Oblique, Pathological, Spiral. ")
                .append("Regiunile anatomice clasificate sunt: Mână, Picior, Șold, Umăr.\n\n");

        sb.append("REGULI STRICTE:\n");
        sb.append("1. CRITICAL RULE: YOU MUST DETECT THE USER'S LANGUAGE AND REPLY IN THE EXACT SAME LANGUAGE! IF THE USER WRITES IN ENGLISH, YOU MUST REPLY ONLY IN ENGLISH. Translate all patient data into English mentally.\n");        sb.append("2. Răspunzi DOAR la întrebări legate de:\n");
        sb.append("   - fracturi (tipuri, simptome, tratament, recuperare, prevenție)\n");
        sb.append("   - sistemul osos și articulațiile\n");
        sb.append("   - traumatologie și ortopedie de bază\n");
        sb.append("   - utilizarea aplicației FractureScope\n");
        sb.append("   - interpretarea radiografiilor user-ului (la nivel general, neoficial)\n");
        sb.append("3. Dacă întrebarea NU are legătură cu medicina sau cu aplicația, refuză politicos ")
                .append("și redirecționează către un subiect relevant.\n");
        sb.append("4. Nu pune diagnostice oficiale. Recomandă consult medical real pentru decizii clinice.\n");
        sb.append("5. Răspunsuri clare, structurate, la obiect — maxim 200-250 de cuvinte de obicei.\n");
        sb.append("6. Folosește terminologie medicală corectă, dar explicată pe limbajul pacientului.\n\n");

        if (userId != null) {
            Optional<User> userOpt = userRepository.findById(userId);
            userOpt.ifPresent(user -> {
                sb.append("DATE DESPRE UTILIZATORUL ACTUAL:\n");
                sb.append("- Nume: ").append(user.getName()).append("\n");
                sb.append("- Rol: ").append(user.getRole()).append(" ");
                if (user.getRole().name().equals("DOCTOR")) {
                    sb.append("(poți folosi terminologie medicală mai avansată)\n");
                } else {
                    sb.append("(folosește explicații accesibile, nu prea tehnice)\n");
                }

                try {
                    List<RadiographyDto> rads = radiographyService.getRadiographiesByUser(userId);
                    if (!rads.isEmpty()) {
                        sb.append("\nULTIMELE RADIOGRAFII ALE UTILIZATORULUI (cele mai recente primele):\n");
                        int limit = Math.min(5, rads.size());
                        for (int i = 0; i < limit; i++) {
                            RadiographyDto r = rads.get(i);
                            sb.append("- ID ").append(r.getId())
                                    .append(" | regiune: ").append(r.getAnatomicRegion() != null ? r.getAnatomicRegion() : "n/a")
                                    .append(" | verdict: ");
                            if (Boolean.TRUE.equals(r.getHasFracture())) {
                                sb.append("FRACTURATĂ");
                                if (r.getFractureType() != null) {
                                    sb.append(" (tip: ").append(r.getFractureType()).append(")");
                                }
                            } else if (Boolean.FALSE.equals(r.getHasFracture())) {
                                sb.append("nefracturat");
                            } else {
                                sb.append("n/a");
                            }
                            sb.append(" | data: ").append(r.getUploadDate()).append("\n");
                        }
                        sb.append("Dacă utilizatorul întreabă despre fracturile lui, folosește datele de mai sus.\n");
                    }
                } catch (Exception e) {
                    System.err.println("Nu am putut încărca radiografiile pentru system prompt: " + e.getMessage());
                }
            });
        }
        return sb.toString();
    }
}