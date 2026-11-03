package com.evenpass.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ep_checkin_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CheckInLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 64)
    private String qrToken;

    @Column(nullable = false, length = 100)
    private String guestName;

    @Column(nullable = false)
    private Long eventId;

    @Column(nullable = false, length = 30)
    private String status; // AUTHORIZED, ALREADY_USED, INVALID

    @Builder.Default
    private LocalDateTime scanTimestamp = LocalDateTime.now();

    @Column(length = 50)
    private String operatorUsername;

    @Column(length = 50)
    private String assignedTableName;

    @Column(length = 255)
    private String notes;
}
