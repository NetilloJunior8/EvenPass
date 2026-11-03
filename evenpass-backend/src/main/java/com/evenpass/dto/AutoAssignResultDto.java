package com.evenpass.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AutoAssignResultDto {
    private Long salonId;
    private String salonName;
    private int totalGuestsAssigned;
    private int totalPassesAssigned;
    private int tablesUtilized;
    private int remainingUnassignedGuests;
    private String message;
    private List<TableAssignmentSummary> tables;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TableAssignmentSummary {
        private Long tableId;
        private Integer tableNumber;
        private String tableName;
        private Integer capacity;
        private int occupiedSeats;
        private List<String> guestNames;
    }
}
