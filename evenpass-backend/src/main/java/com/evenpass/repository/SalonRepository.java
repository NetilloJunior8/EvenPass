package com.evenpass.repository;

import com.evenpass.entity.Salon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SalonRepository extends JpaRepository<Salon, Long> {
    List<Salon> findByEventId(Long eventId);
    Optional<Salon> findFirstByEventId(Long eventId);
}
