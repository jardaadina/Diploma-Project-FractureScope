package com.pweb.authservice.service;

import com.pweb.authservice.dto.*;
import com.pweb.authservice.entity.*;
import com.pweb.authservice.repository.UserRepository;
import com.pweb.authservice.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtil jwtUtil;

    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists!");
        }

        User user = new User();
        user.setName(request.getName());
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(Role.valueOf(request.getRole().toUpperCase()));

        userRepository.save(user);

        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name(),
                user.getName(),
                user.getId()
        );
        return new AuthResponse(
                token,
                user.getName(),
                user.getEmail(),
                user.getRole().name().toLowerCase(),
                user.getId()
        );
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Unknown user!"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Incorect password!");
        }

        String token = jwtUtil.generateToken(
                user.getEmail(),
                user.getRole().name(),
                user.getName(),
                user.getId()
        );
        return new AuthResponse(
                token,
                user.getName(),
                user.getEmail(),
                user.getRole().name().toLowerCase(),
                user.getId()
        );
    }
    public ValidateTokenResponse validateToken(String token) {
        if (jwtUtil.validateToken(token)) {
            String username = jwtUtil.getUsernameFromToken(token);
            String role = jwtUtil.getRoleFromToken(token);
            Integer userId = jwtUtil.getUserIdFromToken(token);

            return new ValidateTokenResponse(true, username, role, userId);
        }
        return new ValidateTokenResponse(false, null, null, null);
    }

}