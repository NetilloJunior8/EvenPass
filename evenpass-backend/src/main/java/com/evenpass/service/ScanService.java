package com.evenpass.service;

import com.evenpass.dto.ScanRequestDto;
import com.evenpass.dto.ScanResponseDto;
import com.evenpass.entity.CheckInLog;
import com.evenpass.entity.Guest;
import com.evenpass.repository.CheckInLogRepository;
import com.evenpass.repository.GuestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScanService {

    private final GuestRepository guestRepository;
    private final CheckInLogRepository checkInLogRepository;

    @Transactional
    public ScanResponseDto validateAndCheckIn(ScanRequestDto request) {
        String token = request.getQrToken().trim();
        Optional<Guest> guestOpt = guestRepository.findByQrCodeToken(token);

        if (guestOpt.isEmpty()) {
            // Log invalid attempt
            checkInLogRepository.save(CheckInLog.builder()
                    .qrToken(token)
                    .guestName("Desconocido / Inválido")
                    .eventId(0L)
                    .status("INVALID")
                    .operatorUsername(request.getOperatorUsername())
                    .notes("Código QR no reconocido en la base de datos.")
                    .build());

            return ScanResponseDto.builder()
                    .valid(false)
                    .alertType("NOT_FOUND")
                    .message("Código QR no válido. Este pase no existe en el sistema.")
                    .build();
        }

        Guest guest = guestOpt.get();
        Long eventId = guest.getEvent() != null ? guest.getEvent().getId() : 0L;
        String eventName = guest.getEvent() != null ? guest.getEvent().getName() : "Evento";
        String tableName = guest.getAssignedTable() != null ? guest.getAssignedTable().getTableName() : "Sin mesa asignada";
        int totalPasses = 1 + (guest.getNumCompanions() != null ? guest.getNumCompanions() : 0);

        // Security Check: Anti-replay / Duplicate pass check
        if ("ATTENDED".equalsIgnoreCase(guest.getStatus())) {
            checkInLogRepository.save(CheckInLog.builder()
                    .qrToken(token)
                    .guestName(guest.getFullName())
                    .eventId(eventId)
                    .status("ALREADY_USED")
                    .operatorUsername(request.getOperatorUsername())
                    .assignedTableName(tableName)
                    .notes("Intento de re-ingreso bloqueado. Pase ya validado a las " + guest.getCheckedInAt())
                    .build());

            return ScanResponseDto.builder()
                    .valid(false)
                    .alertType("ALREADY_USED")
                    .message("ALERTA DE SEGURIDAD: Este pase ya fue utilizado a las " + 
                            (guest.getCheckedInAt() != null ? guest.getCheckedInAt().toLocalTime() : "hace unos momentos"))
                    .guestName(guest.getFullName())
                    .totalPasses(totalPasses)
                    .assignedTableName(tableName)
                    .eventName(eventName)
                    .checkInTime(guest.getCheckedInAt())
                    .currentAttendedCount(guestRepository.countByEventIdAndStatus(eventId, "ATTENDED"))
                    .build();
        }

        // Valid Check-In
        LocalDateTime now = LocalDateTime.now();
        guest.setStatus("ATTENDED");
        guest.setCheckedInAt(now);
        guestRepository.save(guest);

        checkInLogRepository.save(CheckInLog.builder()
                .qrToken(token)
                .guestName(guest.getFullName())
                .eventId(eventId)
                .status("AUTHORIZED")
                .operatorUsername(request.getOperatorUsername())
                .assignedTableName(tableName)
                .notes("Ingreso autorizado exitosamente. " + totalPasses + " personas.")
                .build());

        long attendedCount = guestRepository.countByEventIdAndStatus(eventId, "ATTENDED");

        return ScanResponseDto.builder()
                .valid(true)
                .alertType("SUCCESS")
                .message("¡Acceso Autorizado! Bienvenido al evento.")
                .guestName(guest.getFullName())
                .totalPasses(totalPasses)
                .assignedTableName(tableName)
                .eventName(eventName)
                .checkInTime(now)
                .currentAttendedCount(attendedCount)
                .build();
    }
}
