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
public class GuestDto {
    private Long id;
    private Long eventId;
    private String fullName;
    private String email;
    private String phone;
    private Integer numCompanions;
    private Integer totalPasses;
    private String status;
    private String qrCodeToken;
    private Long assignedTableId;
    private String assignedTableName;
    private String dietNotes;
    private LocalDateTime confirmedAt;
    private LocalDateTime checkedInAt;
}
