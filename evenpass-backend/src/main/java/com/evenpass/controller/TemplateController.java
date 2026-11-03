package com.evenpass.controller;

import com.evenpass.entity.InvitationTemplate;
import com.evenpass.repository.InvitationTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final InvitationTemplateRepository templateRepository;

    @GetMapping
    public ResponseEntity<List<InvitationTemplate>> getAllTemplates() {
        return ResponseEntity.ok(templateRepository.findAll());
    }

    @GetMapping("/{slug}")
    public ResponseEntity<?> getTemplateBySlug(@PathVariable String slug) {
        return templateRepository.findBySlug(slug)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
