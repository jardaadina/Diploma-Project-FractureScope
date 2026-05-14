package com.pweb.authservice.controller;

import com.pweb.authservice.dto.*;
import com.pweb.authservice.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            return ResponseEntity.ok(authService.register(request));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            return ResponseEntity.ok(authService.login(request));
        } catch (Exception e) {
            return ResponseEntity.status(401)
                    .body("Email or password incorect");        }
    }
    @PostMapping("/validate")
    public ResponseEntity<ValidateTokenResponse> validateToken(@RequestBody ValidateTokenRequest request) {
        ValidateTokenResponse response = authService.validateToken(request.getToken());
        return ResponseEntity.ok(response);
    }

}