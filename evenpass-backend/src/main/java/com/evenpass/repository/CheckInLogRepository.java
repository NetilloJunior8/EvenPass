package com.evenpass.repository;

import com.evenpass.entity.CheckInLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CheckInLogRepository extends JpaRepository<CheckInLog, Long> {
    List<CheckInLog> findTop20ByEventIdOrderByScanTimestampDesc(Long eventId);
    List<CheckInLog> findByEventId(Long eventId);
}
