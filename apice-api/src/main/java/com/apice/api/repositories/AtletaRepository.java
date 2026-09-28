package com.apice.api.repositories;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.apice.api.entities.Atleta;

@Repository
public interface AtletaRepository extends JpaRepository<Atleta, Long> {
}