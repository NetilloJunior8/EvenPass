package com.evenpass.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Entity
@Table(name = "ep_salon_tables")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SalonTable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer tableNumber;

    @NotBlank
    @Column(nullable = false, length = 50)
    private String tableName; // "Mesa 01 - Familia Novia"

    @Builder.Default
    @Column(length = 20)
    private String shape = "ROUND"; // ROUND, RECTANGULAR, IMPERIAL

    @Builder.Default
    private Integer capacity = 10;

    @Builder.Default
    private Double posX = 0.0; // Percentage or coordinate in floor plan

    @Builder.Default
    private Double posY = 0.0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "salon_id", nullable = false)
    @JsonIgnoreProperties("tables")
    private Salon salon;
}
