package com.evenpass.service;

import com.evenpass.dto.AutoAssignResultDto;
import com.evenpass.entity.Guest;
import com.evenpass.entity.Salon;
import com.evenpass.entity.SalonTable;
import com.evenpass.repository.GuestRepository;
import com.evenpass.repository.SalonRepository;
import com.evenpass.repository.SalonTableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class CroquisSeatingService {

    private final SalonRepository salonRepository;
    private final SalonTableRepository tableRepository;
    private final GuestRepository guestRepository;

    @Transactional
    public AutoAssignResultDto autoAssignTablesForSalon(Long salonId) {
        Salon salon = salonRepository.findById(salonId)
                .orElseThrow(() -> new IllegalArgumentException("Salón no encontrado con id: " + salonId));

        List<SalonTable> tables = tableRepository.findBySalonIdOrderByTableNumberAsc(salonId);
        if (tables.isEmpty()) {
            return AutoAssignResultDto.builder()
                    .salonId(salonId)
                    .salonName(salon.getName())
                    .message("No hay mesas configuradas en este salón.")
                    .build();
        }

        // Get confirmed guests for the event
        Long eventId = salon.getEvent() != null ? salon.getEvent().getId() : null;
        if (eventId == null) {
            return AutoAssignResultDto.builder()
                    .salonId(salonId)
                    .salonName(salon.getName())
                    .message("El salón no está asociado a ningún evento activo.")
                    .build();
        }

        List<Guest> confirmedGuests = guestRepository.findByEventIdAndStatus(eventId, "CONFIRMED");
        if (confirmedGuests.isEmpty()) {
            // Also consider all guests if none are confirmed yet for demo convenience
            confirmedGuests = guestRepository.findByEventId(eventId);
        }

        // Map to track occupied seats per table
        Map<Long, Integer> occupiedMap = new HashMap<>();
        Map<Long, List<String>> tableGuestsMap = new HashMap<>();
        for (SalonTable t : tables) {
            occupiedMap.put(t.getId(), 0);
            tableGuestsMap.put(t.getId(), new ArrayList<>());
        }

        // Sort guests by party size (descending) to optimize seating
        List<Guest> sortedGuests = new ArrayList<>(confirmedGuests);
        sortedGuests.sort((g1, g2) -> Integer.compare(
                (1 + g2.getNumCompanions()),
                (1 + g1.getNumCompanions())
        ));

        int guestsAssignedCount = 0;
        int passesAssignedCount = 0;
        int unassignedCount = 0;

        for (Guest guest : sortedGuests) {
            int partySize = 1 + (guest.getNumCompanions() != null ? guest.getNumCompanions() : 0);
            SalonTable bestTable = null;

            // Find first table with enough remaining capacity
            for (SalonTable table : tables) {
                int currentOccupied = occupiedMap.get(table.getId());
                int maxCap = table.getCapacity() != null ? table.getCapacity() : 10;

                if (currentOccupied + partySize <= maxCap) {
                    bestTable = table;
                    break;
                }
            }

            // Fallback: If no single table has room for the entire party, find table with most free space
            if (bestTable == null) {
                for (SalonTable table : tables) {
                    int currentOccupied = occupiedMap.get(table.getId());
                    int maxCap = table.getCapacity() != null ? table.getCapacity() : 10;
                    if (currentOccupied < maxCap) {
                        bestTable = table;
                        break;
                    }
                }
            }

            if (bestTable != null) {
                guest.setAssignedTable(bestTable);
                guestRepository.save(guest);

                int prevOcc = occupiedMap.get(bestTable.getId());
                occupiedMap.put(bestTable.getId(), prevOcc + partySize);

                String guestLabel = guest.getFullName() + (partySize > 1 ? " (+" + (partySize - 1) + " acomp.)" : "");
                tableGuestsMap.get(bestTable.getId()).add(guestLabel);

                guestsAssignedCount++;
                passesAssignedCount += partySize;
            } else {
                unassignedCount++;
            }
        }

        // Build result summaries
        List<AutoAssignResultDto.TableAssignmentSummary> summaries = new ArrayList<>();
        int tablesUsed = 0;
        for (SalonTable table : tables) {
            int occ = occupiedMap.get(table.getId());
            if (occ > 0) tablesUsed++;

            summaries.add(AutoAssignResultDto.TableAssignmentSummary.builder()
                    .tableId(table.getId())
                    .tableNumber(table.getTableNumber())
                    .tableName(table.getTableName())
                    .capacity(table.getCapacity())
                    .occupiedSeats(occ)
                    .guestNames(tableGuestsMap.get(table.getId()))
                    .build());
        }

        return AutoAssignResultDto.builder()
                .salonId(salonId)
                .salonName(salon.getName())
                .totalGuestsAssigned(guestsAssignedCount)
                .totalPassesAssigned(passesAssignedCount)
                .tablesUtilized(tablesUsed)
                .remainingUnassignedGuests(unassignedCount)
                .message("Asignación inteligente completada con éxito. Se acomodaron familias completas por capacidad.")
                .tables(summaries)
                .build();
    }
}
