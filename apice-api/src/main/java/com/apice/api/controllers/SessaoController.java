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

import com.apice.api.dto.SessaoDTO;
import com.apice.api.entities.Sessao;
import com.apice.api.services.SessaoService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/sessoes")
public class SessaoController {

    @Autowired
    private SessaoService sessaoService;

    @GetMapping
    public ResponseEntity<List<Sessao>> listarTodas() {
        return ResponseEntity.ok(sessaoService.listarTodas());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Sessao> buscarPorId(@PathVariable Long id) {
        return sessaoService.buscarPorId(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // Endpoint extra para buscar sessões por atleta
    @GetMapping("/atleta/{atletaId}")
    public ResponseEntity<List<Sessao>> buscarPorAtletaId(@PathVariable Long atletaId) {
        return ResponseEntity.ok(sessaoService.buscarPorAtletaId(atletaId));
    }

    @PostMapping
    public ResponseEntity<?> criar(@Valid @RequestBody SessaoDTO dto) {
        try {
            Sessao novaSessao = sessaoService.criar(dto);
            return ResponseEntity.status(HttpStatus.CREATED).body(novaSessao);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> atualizar(@PathVariable Long id, @Valid @RequestBody SessaoDTO dto) {
        try {
            return sessaoService.atualizar(id, dto)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletar(@PathVariable Long id) {
        if (sessaoService.deletar(id)) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}