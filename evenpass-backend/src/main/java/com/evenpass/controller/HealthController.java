package com.evenpass.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.Map;

@RestController
public class HealthController {

    @GetMapping(value = {"/", "/health", "/api/public/health"})
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "EvenPass Enterprise Backend",
                "version", "1.0.0",
                "timestamp", LocalDateTime.now().toString()
        ));
    }
}
