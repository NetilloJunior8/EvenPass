package com.evenpass.repository;

import com.evenpass.entity.InvitationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface InvitationTemplateRepository extends JpaRepository<InvitationTemplate, Long> {
    Optional<InvitationTemplate> findBySlug(String slug);
}
