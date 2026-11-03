package com.evenpass.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "ep_salons")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Salon {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false, length = 100)
    private String name;

    @Builder.Default
    private Integer totalCapacity = 250;

    @Builder.Default
    private Integer widthMeters = 30;

    @Builder.Default
    private Integer lengthMeters = 20;

    @Column(columnDefinition = "TEXT")
    private String layoutConfigJson; // JSON with zones: stage, dance floor, entrance, bar

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_id")
    private Event event;

    @OneToMany(mappedBy = "salon", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnoreProperties("salon")
    @Builder.Default
    private List<SalonTable> tables = new ArrayList<>();
}
