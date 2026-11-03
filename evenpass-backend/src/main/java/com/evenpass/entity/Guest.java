package com.evenpass.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ep_guests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Guest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(length = 100)
    private String email;

    @Column(length = 30)
    private String phone;

    @Builder.Default
    private Integer numCompanions = 0; // Total passes = 1 + numCompanions

    @Builder.Default
    @Column(nullable = false, length = 30)
    private String status = "PENDING"; // PENDING, CONFIRMED, DECLINED, ATTENDED

    @Column(unique = true, nullable = false, length = 64)
    private String qrCodeToken; // Unique secure verification hash for entry

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_table_id")
    @JsonIgnoreProperties({"salon"})
    private SalonTable assignedTable;

    @Column(columnDefinition = "TEXT")
    private String dietNotes;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id", nullable = false)
    @JsonIgnoreProperties({"organizer"})
    private Event event;

    private LocalDateTime confirmedAt;

    private LocalDateTime checkedInAt;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
