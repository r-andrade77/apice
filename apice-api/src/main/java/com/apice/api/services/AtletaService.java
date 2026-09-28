package com.apice.api.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.apice.api.dto.AtletaDTO;
import com.apice.api.entities.Atleta;
import com.apice.api.repositories.AtletaRepository;

@Service
public class AtletaService {

    @Autowired
    private AtletaRepository atletaRepository;

    public List<Atleta> listarTodos() {
        return atletaRepository.findAll();
    }

    public Optional<Atleta> buscarPorId(Long id) {
        return atletaRepository.findById(id);
    }

    public Atleta criar(AtletaDTO dto) {
        Atleta atleta = new Atleta();
        atleta.setNome(dto.getNome());
        atleta.setDataNascimento(dto.getDataNascimento());
        atleta.setPesoKg(dto.getPesoKg());
        atleta.setAlturaCm(dto.getAlturaCm());

        return atletaRepository.save(atleta);
    }

    public Optional<Atleta> atualizar(Long id, AtletaDTO dto) {
        return atletaRepository.findById(id)
                .map(atletaExistente -> {
                    atletaExistente.setNome(dto.getNome());
                    atletaExistente.setDataNascimento(dto.getDataNascimento());
                    atletaExistente.setPesoKg(dto.getPesoKg());
                    atletaExistente.setAlturaCm(dto.getAlturaCm());
                    return atletaRepository.save(atletaExistente);
                });
    }

    public boolean deletar(Long id) {
        if (atletaRepository.existsById(id)) {
            atletaRepository.deleteById(id);
            return true;
        }
        return false;
    }
}