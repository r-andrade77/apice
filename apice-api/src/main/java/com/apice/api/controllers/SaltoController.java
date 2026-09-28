package com.apice.api.controllers;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.apice.api.dto.SaltoDTO;
import com.apice.api.entities.Salto;
import com.apice.api.services.SaltoService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/saltos")
public class SaltoController {

    @Autowired
    private SaltoService saltoService;

    @GetMapping
    public ResponseEntity<List<Salto>> listarTodos() {
        return ResponseEntity.ok(saltoService.listarTodos());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Salto> buscarPorId(@PathVariable Long id) {
        return saltoService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/sessao/{sessaoId}")
    public ResponseEntity<List<Salto>> buscarPorSessaoId(@PathVariable Long sessaoId) {
        return ResponseEntity.ok(saltoService.buscarPorSessaoId(sessaoId));
    }

    @PostMapping
    public ResponseEntity<?> criar(@Valid @RequestBody SaltoDTO dto) {
        try {
            Salto novoSalto = saltoService.criar(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(novoSalto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @Valid @RequestBody SaltoDTO dto) {
        try {
            return saltoService.atualizar(id, dto)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        if (saltoService.deletar(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}