package com.evenpass.controller;

import com.evenpass.dto.GuestDto;
import com.evenpass.entity.Event;
import com.evenpass.entity.Guest;
import com.evenpass.entity.SalonTable;
import com.evenpass.repository.EventRepository;
import com.evenpass.repository.GuestRepository;
import com.evenpass.repository.SalonTableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/guests")
@RequiredArgsConstructor
public class GuestController {

    private final GuestRepository guestRepository;
    private final EventRepository eventRepository;
    private final SalonTableRepository tableRepository;

    @GetMapping("/by-event/{eventId}")
    public ResponseEntity<List<GuestDto>> getGuestsByEvent(@PathVariable Long eventId) {
        List<Guest> guests = guestRepository.findByEventId(eventId);
        List<GuestDto> dtos = guests.stream().map(this::toDto).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<?> createGuest(@RequestBody GuestDto dto) {
        Event event = eventRepository.findById(dto.getEventId())
                .orElseThrow(() -> new IllegalArgumentException("Evento no encontrado: " + dto.getEventId()));

        SalonTable table = null;
        if (dto.getAssignedTableId() != null) {
            table = tableRepository.findById(dto.getAssignedTableId()).orElse(null);
        }

        String qrToken = "EP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        Guest guest = Guest.builder()
                .fullName(dto.getFullName())
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .numCompanions(dto.getNumCompanions() != null ? dto.getNumCompanions() : 0)
                .status(dto.getStatus() != null ? dto.getStatus() : "PENDING")
                .qrCodeToken(qrToken)
                .dietNotes(dto.getDietNotes())
                .assignedTable(table)
                .event(event)
                .build();

        Guest saved = guestRepository.save(guest);
        return ResponseEntity.ok(toDto(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateGuest(@PathVariable Long id, @RequestBody GuestDto dto) {
        return guestRepository.findById(id).map(guest -> {
            guest.setFullName(dto.getFullName());
            guest.setEmail(dto.getEmail());
            guest.setPhone(dto.getPhone());
            guest.setNumCompanions(dto.getNumCompanions());
            if (dto.getStatus() != null) guest.setStatus(dto.getStatus());
            guest.setDietNotes(dto.getDietNotes());

            if (dto.getAssignedTableId() != null) {
                SalonTable table = tableRepository.findById(dto.getAssignedTableId()).orElse(null);
                guest.setAssignedTable(table);
            } else if (Boolean.TRUE.equals(dto.getAssignedTableId() == null)) {
                guest.setAssignedTable(null);
            }

            Guest updated = guestRepository.save(guest);
            return ResponseEntity.ok(toDto(updated));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteGuest(@PathVariable Long id) {
        if (guestRepository.existsById(id)) {
            guestRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Invitado eliminado"));
        }
        return ResponseEntity.notFound().build();
    }

    private GuestDto toDto(Guest g) {
        int companions = g.getNumCompanions() != null ? g.getNumCompanions() : 0;
        return GuestDto.builder()
                .id(g.getId())
                .eventId(g.getEvent() != null ? g.getEvent().getId() : null)
                .fullName(g.getFullName())
                .email(g.getEmail())
                .phone(g.getPhone())
                .numCompanions(companions)
                .totalPasses(1 + companions)
                .status(g.getStatus())
                .qrCodeToken(g.getQrCodeToken())
                .assignedTableId(g.getAssignedTable() != null ? g.getAssignedTable().getId() : null)
                .assignedTableName(g.getAssignedTable() != null ? g.getAssignedTable().getTableName() : "Sin mesa asignada")
                .dietNotes(g.getDietNotes())
                .confirmedAt(g.getConfirmedAt())
                .checkedInAt(g.getCheckedInAt())
                .build();
    }
}
