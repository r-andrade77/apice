package com.apice.api.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apice.api.entities.Sessao;

@Repository
public interface SessaoRepository extends JpaRepository<Sessao, Long> {
    
    // Método extra para buscar todas as sessões de um atleta específico (opcional, mas muito útil)
    List<Sessao> findByAtletaId(Long atletaId);
}