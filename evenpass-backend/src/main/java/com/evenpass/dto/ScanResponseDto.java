package com.evenpass.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScanResponseDto {
    private boolean valid;
    private String alertType; // SUCCESS, ALREADY_USED, NOT_FOUND
    private String message;
    private String guestName;
    private Integer totalPasses;
    private String assignedTableName;
    private String eventName;
    private LocalDateTime checkInTime;
    private Long currentAttendedCount;
}
