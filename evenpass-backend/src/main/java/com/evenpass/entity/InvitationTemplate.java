package com.evenpass.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "ep_invitation_templates")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InvitationTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 50)
    private String slug; // miriam-isidro, neon-glow, editorial-clean

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 50)
    private String category; // Boda, XV Años, Gala, Corporativo

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 255)
    private String previewImageUrl;

    @Column(columnDefinition = "TEXT")
    private String themeConfigJson; // Colors, fonts, musicUrl, overlayConfig
}
