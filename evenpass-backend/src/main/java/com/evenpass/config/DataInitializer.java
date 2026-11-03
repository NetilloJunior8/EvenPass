package com.evenpass.config;

import com.evenpass.entity.*;
import com.evenpass.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final EventRepository eventRepository;
    private final SalonRepository salonRepository;
    private final SalonTableRepository tableRepository;
    private final GuestRepository guestRepository;
    private final InvitationTemplateRepository templateRepository;
    private final CheckInLogRepository checkInLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            return;
        }

        log.info("Inicializando datos iniciales de EvenPass SaaS...");

        User admin = User.builder()
                .username("ernesto")
                .email("ernesto@evenpass.io")
                .fullName("ERNESTO")
                .password(passwordEncoder.encode("admin123"))
                .role(Role.ROLE_ADMIN)
                .active(true)
                .build();
        userRepository.save(admin);

        User adminLuis = User.builder()
                .username("luis")
                .email("luis@evenpass.io")
                .fullName("LUIS")
                .password(passwordEncoder.encode("admin123"))
                .role(Role.ROLE_ADMIN)
                .active(true)
                .build();
        userRepository.save(adminLuis);

        User adminLinda = User.builder()
                .username("linda")
                .email("linda@evenpass.io")
                .fullName("LINDA")
                .password(passwordEncoder.encode("admin123"))
                .role(Role.ROLE_ADMIN)
                .active(true)
                .build();
        userRepository.save(adminLinda);

        User organizer = User.builder()
                .username("organizador")
                .email("organizador@evenpass.io")
                .fullName("Laura Méndez")
                .password(passwordEncoder.encode("demo123"))
                .role(Role.ROLE_ORGANIZER)
                .active(true)
                .build();
        userRepository.save(organizer);

        User staff = User.builder()
                .username("staff")
                .email("puerta@evenpass.io")
                .fullName("Personal de Entrada")
                .password(passwordEncoder.encode("demo123"))
                .role(Role.ROLE_STAFF)
                .active(true)
                .build();
        userRepository.save(staff);

        // 2. Plantillas de Invitación
        InvitationTemplate t1 = InvitationTemplate.builder()
                .slug("miriam-isidro")
                .name("Miriam & Isidro · Gold Luxury Wedding")
                .category("Boda")
                .description("Diseño nupcial de gala con acentos dorados, música clásica y detalles de iglesia y recepción.")
                .previewImageUrl("assets/templates/miriam-isidro/1.jpg")
                .themeConfigJson("{\"color\": \"#D4AF37\", \"font\": \"Cormorant Garamond\", \"music\": true}")
                .build();

        InvitationTemplate t2 = InvitationTemplate.builder()
                .slug("neon-party")
                .name("Mis 18 & Fiesta Neón Glow")
                .category("XV Años / Fiesta")
                .description("Diseño oscuro moderno con tipografía fluorescente y overlay animado VIP.")
                .previewImageUrl("assets/templates/neon-party/index.html")
                .themeConfigJson("{\"color\": \"#FF2A85\", \"font\": \"Montserrat\", \"neon\": true}")
                .build();

        InvitationTemplate t3 = InvitationTemplate.builder()
                .slug("editorial-clean")
                .name("Editorial Minimalista & Summit")
                .category("Corporativo / Gala")
                .description("Tipografía suiza contemporánea, integración de agenda y credencial.")
                .previewImageUrl("")
                .themeConfigJson("{\"color\": \"#2563EB\", \"font\": \"Plus Jakarta Sans\"}")
                .build();

        templateRepository.saveAll(List.of(t1, t2, t3));

        // 3. Evento Principal (Programado para hoy a las 19:00 hrs)
        Event event = Event.builder()
                .name("Gran Gala Nupcial · Sofía & Mateo")
                .description("Ceremonia religiosa en Catedral y recepción de gala en Hacienda Los Olivos.")
                .eventType("Boda")
                .eventDate(LocalDateTime.now().withHour(19).withMinute(0).withSecond(0))
                .venueName("Hacienda Los Olivos · Salón Real")
                .locationAddress("Carretera a Imala Km 4.5, Culiacán, Sin.")
                .maxCapacity(250)
                .status("PENDIENTE")
                .templateSlug("miriam-isidro")
                .organizer(admin)
                .build();
        eventRepository.save(event);

        Event event2 = Event.builder()
                .name("Mis 18 - Ivonne (VIP Neon Party)")
                .description("Fiesta de cumpleaños y graduación temática neón.")
                .eventType("XV Años")
                .eventDate(LocalDateTime.now().plusMonths(1))
                .venueName("Sky Lounge Terrace")
                .locationAddress("Blvd. Pedro Infante 2200, Culiacán")
                .maxCapacity(180)
                .status("PUBLISHED")
                .templateSlug("neon-party")
                .organizer(admin)
                .build();
        eventRepository.save(event2);

        // 4. Salón & Croquis
        Salon salon = Salon.builder()
                .name("Salón Real Imperial")
                .totalCapacity(250)
                .widthMeters(40)
                .lengthMeters(25)
                .layoutConfigJson("{\"zones\": [\"Escenario\", \"Pista de Baile\", \"Barra\", \"Entrada\"]}")
                .event(event)
                .build();
        salonRepository.save(salon);

        // 5. Mesas del Salón
        SalonTable m1 = SalonTable.builder().salon(salon).tableNumber(1).tableName("Mesa 01 - Presídium / Familia").capacity(10).posX(20.0).posY(25.0).shape("ROUND").build();
        SalonTable m2 = SalonTable.builder().salon(salon).tableNumber(2).tableName("Mesa 02 - Familia Novio").capacity(10).posX(20.0).posY(55.0).shape("ROUND").build();
        SalonTable m3 = SalonTable.builder().salon(salon).tableNumber(3).tableName("Mesa 03 - Padrinos").capacity(8).posX(20.0).posY(80.0).shape("ROUND").build();
        SalonTable m4 = SalonTable.builder().salon(salon).tableNumber(4).tableName("Mesa 04 - Amigos Universidad").capacity(10).posX(80.0).posY(25.0).shape("ROUND").build();
        SalonTable m5 = SalonTable.builder().salon(salon).tableNumber(5).tableName("Mesa 05 - Amigos Trabajo").capacity(10).posX(80.0).posY(55.0).shape("ROUND").build();
        SalonTable m6 = SalonTable.builder().salon(salon).tableNumber(6).tableName("Mesa 06 - Familiares Foráneos").capacity(8).posX(80.0).posY(80.0).shape("ROUND").build();
        tableRepository.saveAll(List.of(m1, m2, m3, m4, m5, m6));

        // 6. Invitados
        Guest g1 = Guest.builder().event(event).fullName("Ana Valentina Ruiz").email("ana@gmail.com").phone("667 123 4567").numCompanions(1).status("ATTENDED").qrCodeToken("EP-9901").assignedTable(m1).checkedInAt(LocalDateTime.now().minusHours(1)).build();
        Guest g2 = Guest.builder().event(event).fullName("Carlos Eduardo Mendoza").email("carlos@gmail.com").phone("667 234 5678").numCompanions(1).status("CONFIRMED").qrCodeToken("EP-9902").assignedTable(m1).confirmedAt(LocalDateTime.now().minusDays(2)).build();
        Guest g3 = Guest.builder().event(event).fullName("Valeria Gómez").email("valeria@gmail.com").phone("667 345 6789").numCompanions(2).status("CONFIRMED").qrCodeToken("EP-9903").assignedTable(m2).confirmedAt(LocalDateTime.now().minusDays(1)).build();
        Guest g4 = Guest.builder().event(event).fullName("Héctor Morales").email("hector@gmail.com").phone("667 456 7890").numCompanions(1).status("CONFIRMED").qrCodeToken("EP-9904").assignedTable(m4).confirmedAt(LocalDateTime.now().minusHours(5)).build();
        Guest g5 = Guest.builder().event(event).fullName("Diana Laura Sánchez").email("diana@gmail.com").phone("667 567 8901").numCompanions(0).status("PENDING").qrCodeToken("EP-9905").build();
        Guest g6 = Guest.builder().event(event).fullName("Fernando Aguilar").email("fernando@gmail.com").phone("667 678 9012").numCompanions(3).status("CONFIRMED").qrCodeToken("EP-9906").assignedTable(m4).confirmedAt(LocalDateTime.now().minusDays(3)).build();
        Guest g7 = Guest.builder().event(event).fullName("Roberto Silva").email("roberto@gmail.com").phone("667 789 0123").numCompanions(1).status("CONFIRMED").qrCodeToken("EP-9907").assignedTable(m5).confirmedAt(LocalDateTime.now().minusDays(1)).build();
        Guest g8 = Guest.builder().event(event).fullName("Gabriela Castro").email("gaby@gmail.com").phone("667 890 1234").numCompanions(1).status("DECLINED").qrCodeToken("EP-9908").build();

        guestRepository.saveAll(List.of(g1, g2, g3, g4, g5, g6, g7, g8));

        // 7. Registro inicial de Check-In
        checkInLogRepository.save(CheckInLog.builder()
                .qrToken("EP-9901")
                .guestName("Ana Valentina Ruiz")
                .eventId(event.getId())
                .status("AUTHORIZED")
                .operatorUsername("ernesto")
                .assignedTableName("Mesa 01 - Presídium / Familia")
                .notes("Ingreso correcto · 2 personas")
                .build());

        log.info("Datos iniciales de EvenPass cargados exitosamente.");
    }
}
