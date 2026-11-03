package com.evenpass.controller;

import com.evenpass.dto.ScanRequestDto;
import com.evenpass.dto.ScanResponseDto;
import com.evenpass.entity.CheckInLog;
import com.evenpass.repository.CheckInLogRepository;
import com.evenpass.service.ScanService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scan")
@RequiredArgsConstructor
public class ScanController {

    private final ScanService scanService;
    private final CheckInLogRepository checkInLogRepository;

    @PostMapping("/validate")
    public ResponseEntity<ScanResponseDto> validateScan(
            @Valid @RequestBody ScanRequestDto request,
            Authentication authentication) {

        if (request.getOperatorUsername() == null && authentication != null) {
            request.setOperatorUsername(authentication.getName());
        }

        ScanResponseDto response = scanService.validateAndCheckIn(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/logs/{eventId}")
    public ResponseEntity<List<CheckInLog>> getRecentLogs(@PathVariable Long eventId) {
        return ResponseEntity.ok(checkInLogRepository.findTop20ByEventIdOrderByScanTimestampDesc(eventId));
    }
}
