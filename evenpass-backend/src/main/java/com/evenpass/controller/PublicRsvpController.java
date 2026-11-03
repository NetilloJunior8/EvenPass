package com.evenpass.controller;

import com.evenpass.entity.Guest;
import com.evenpass.repository.GuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/public")
@RequiredArgsConstructor
public class PublicRsvpController {

    private final GuestRepository guestRepository;

    @PostMapping("/rsvp")
    public ResponseEntity<?> submitRsvp(@RequestBody Map<String, Object> payload) {
        String token = (String) payload.get("qrToken");
        Boolean attending = (Boolean) payload.get("attending");
        Integer companions = payload.get("companions") != null ? Integer.valueOf(payload.get("companions").toString()) : null;
        String dietNotes = (String) payload.get("dietNotes");

        if (token == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Token de invitación requerido"));
        }

        Optional<Guest> guestOpt = guestRepository.findByQrCodeToken(token);
        if (guestOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invitación no encontrada"));
        }

        Guest guest = guestOpt.get();
        if (Boolean.TRUE.equals(attending)) {
            guest.setStatus("CONFIRMED");
            guest.setConfirmedAt(LocalDateTime.now());
            if (companions != null) {
                guest.setNumCompanions(companions);
            }
        } else {
            guest.setStatus("DECLINED");
        }

        if (dietNotes != null) {
            guest.setDietNotes(dietNotes);
        }

        guestRepository.save(guest);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", Boolean.TRUE.equals(attending) ? "¡Asistencia confirmada con éxito!" : "Respuesta registrada",
                "guestName", guest.getFullName(),
                "status", guest.getStatus(),
                "assignedTable", guest.getAssignedTable() != null ? guest.getAssignedTable().getTableName() : "Por asignar"
        ));
    }
}
