package com.pweb.authservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AuthResponse {
    private String token;
    private String type = "Bearer";
    private String name;
    private String email;
    private String role;
    private Integer userId;


    public AuthResponse(String token, String name, String email, String role, Integer userId) {
        this.token = token;
        this.name = name;
        this.email = email;
        this.role = role;
        this.userId = userId;
    }
}