package com.apice.api.repositories;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apice.api.entities.Salto;

@Repository
public interface SaltoRepository extends JpaRepository<Salto, Long> {
    
    // Método útil para procurar todos os saltos efetuados dentro de uma mesma sessão
    List<Salto> findBySessaoId(Long sessaoId);
}