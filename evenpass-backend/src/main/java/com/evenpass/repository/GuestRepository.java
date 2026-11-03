package com.evenpass.repository;

import com.evenpass.entity.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface GuestRepository extends JpaRepository<Guest, Long> {
    List<Guest> findByEventId(Long eventId);
    List<Guest> findByEventIdAndStatus(Long eventId, String status);
    Optional<Guest> findByQrCodeToken(String qrCodeToken);
    List<Guest> findByAssignedTableId(Long tableId);
    long countByEventId(Long eventId);
    long countByEventIdAndStatus(Long eventId, String status);
}
