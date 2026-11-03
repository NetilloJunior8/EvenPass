package com.evenpass.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "ep_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 150)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 50)
    private String eventType; // Boda, XV Años, Gala, Corporativo

    @Column(nullable = false)
    private LocalDateTime eventDate;

    @Column(length = 150)
    private String venueName;

    @Column(length = 255)
    private String locationAddress;

    @Builder.Default
    private Integer maxCapacity = 250;

    @Builder.Default
    @Column(length = 30)
    private String status = "PUBLISHED"; // DRAFT, PUBLISHED, IN_PROGRESS, FINISHED

    @Column(length = 100)
    private String templateSlug; // miriam-isidro, neon-glow, editorial

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id")
    private User organizer;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
