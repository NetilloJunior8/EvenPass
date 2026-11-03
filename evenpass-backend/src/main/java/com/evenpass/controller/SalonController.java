package com.evenpass.controller;

import com.evenpass.dto.AutoAssignResultDto;
import com.evenpass.entity.Salon;
import com.evenpass.entity.SalonTable;
import com.evenpass.repository.SalonRepository;
import com.evenpass.repository.SalonTableRepository;
import com.evenpass.service.CroquisSeatingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/salons")
@RequiredArgsConstructor
public class SalonController {

    private final SalonRepository salonRepository;
    private final SalonTableRepository tableRepository;
    private final CroquisSeatingService seatingService;

    @GetMapping("/{id}")
    public ResponseEntity<?> getSalonById(@PathVariable Long id) {
        return salonRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-event/{eventId}")
    public ResponseEntity<?> getSalonByEventId(@PathVariable Long eventId) {
        return salonRepository.findFirstByEventId(eventId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/tables")
    public ResponseEntity<List<SalonTable>> getTablesBySalon(@PathVariable Long id) {
        return ResponseEntity.ok(tableRepository.findBySalonIdOrderByTableNumberAsc(id));
    }

    @PostMapping("/{id}/auto-assign")
    public ResponseEntity<AutoAssignResultDto> autoAssignTables(@PathVariable Long id) {
        AutoAssignResultDto result = seatingService.autoAssignTablesForSalon(id);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/tables")
    public ResponseEntity<?> addTable(@PathVariable Long id, @RequestBody SalonTable newTable) {
        return salonRepository.findById(id).map(salon -> {
            newTable.setSalon(salon);
            SalonTable saved = tableRepository.save(newTable);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/tables/{tableId}")
    public ResponseEntity<?> updateTablePosition(
            @PathVariable Long tableId,
            @RequestBody Map<String, Object> updates) {
        return tableRepository.findById(tableId).map(table -> {
            if (updates.containsKey("posX")) table.setPosX(Double.valueOf(updates.get("posX").toString()));
            if (updates.containsKey("posY")) table.setPosY(Double.valueOf(updates.get("posY").toString()));
            if (updates.containsKey("tableName")) table.setTableName(updates.get("tableName").toString());
            if (updates.containsKey("capacity")) table.setCapacity(Integer.valueOf(updates.get("capacity").toString()));
            tableRepository.save(table);
            return ResponseEntity.ok(table);
        }).orElse(ResponseEntity.notFound().build());
    }
}
