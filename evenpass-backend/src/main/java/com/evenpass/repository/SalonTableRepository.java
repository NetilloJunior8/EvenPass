package com.evenpass.repository;

import com.evenpass.entity.SalonTable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SalonTableRepository extends JpaRepository<SalonTable, Long> {
    List<SalonTable> findBySalonIdOrderByTableNumberAsc(Long salonId);
}
