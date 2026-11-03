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
public class EventDto {
    private Long id;
    private String name;
    private String description;
    private String eventType;
    private LocalDateTime eventDate;
    private String venueName;
    private String locationAddress;
    private Integer maxCapacity;
    private String status;
    private String templateSlug;
    private Long totalGuests;
    private Long confirmedGuests;
    private Long attendedGuests;
}
