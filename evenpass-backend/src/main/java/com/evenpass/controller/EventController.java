package com.evenpass.controller;

import com.evenpass.dto.EventDto;
import com.evenpass.entity.Event;
import com.evenpass.entity.User;
import com.evenpass.repository.EventRepository;
import com.evenpass.repository.GuestRepository;
import com.evenpass.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/events")
@RequiredArgsConstructor
public class EventController {

    private final EventRepository eventRepository;
    private final GuestRepository guestRepository;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<List<EventDto>> getAllEvents() {
        List<Event> events = eventRepository.findAll();
        List<EventDto> dtos = events.stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getEventById(@PathVariable Long id) {
        return eventRepository.findById(id)
                .map(ev -> ResponseEntity.ok(toDto(ev)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<?> createEvent(@RequestBody EventDto dto, Authentication authentication) {
        User organizer = null;
        if (authentication != null) {
            organizer = userRepository.findByUsername(authentication.getName()).orElse(null);
        }

        Event event = Event.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .eventType(dto.getEventType() != null ? dto.getEventType() : "Boda")
                .eventDate(dto.getEventDate() != null ? dto.getEventDate() : LocalDateTime.now().plusMonths(1))
                .venueName(dto.getVenueName())
                .locationAddress(dto.getLocationAddress())
                .maxCapacity(dto.getMaxCapacity() != null ? dto.getMaxCapacity() : 250)
                .status("PUBLISHED")
                .templateSlug(dto.getTemplateSlug() != null ? dto.getTemplateSlug() : "miriam-isidro")
                .organizer(organizer)
                .build();

        Event saved = eventRepository.save(event);
        return ResponseEntity.ok(toDto(saved));
    }

    @GetMapping("/{id}/stats")
    public ResponseEntity<?> getEventStats(@PathVariable Long id) {
        long total = guestRepository.countByEventId(id);
        long confirmed = guestRepository.countByEventIdAndStatus(id, "CONFIRMED");
        long attended = guestRepository.countByEventIdAndStatus(id, "ATTENDED");
        long declined = guestRepository.countByEventIdAndStatus(id, "DECLINED");
        long pending = guestRepository.countByEventIdAndStatus(id, "PENDING");

        return ResponseEntity.ok(Map.of(
                "eventId", id,
                "totalGuests", total,
                "confirmed", confirmed,
                "attended", attended,
                "declined", declined,
                "pending", pending,
                "attendancePercentage", total > 0 ? (attended * 100 / total) : 0
        ));
    }

    private EventDto toDto(Event ev) {
        long total = guestRepository.countByEventId(ev.getId());
        long confirmed = guestRepository.countByEventIdAndStatus(ev.getId(), "CONFIRMED");
        long attended = guestRepository.countByEventIdAndStatus(ev.getId(), "ATTENDED");

        return EventDto.builder()
                .id(ev.getId())
                .name(ev.getName())
                .description(ev.getDescription())
                .eventType(ev.getEventType())
                .eventDate(ev.getEventDate())
                .venueName(ev.getVenueName())
                .locationAddress(ev.getLocationAddress())
                .maxCapacity(ev.getMaxCapacity())
                .status(ev.getStatus())
                .templateSlug(ev.getTemplateSlug())
                .totalGuests(total)
                .confirmedGuests(confirmed)
                .attendedGuests(attended)
                .build();
    }
}
