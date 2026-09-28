package com.apice.api.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.apice.api.dto.SaltoDTO;
import com.apice.api.entities.Salto;
import com.apice.api.entities.Sessao;
import com.apice.api.repositories.SaltoRepository;
import com.apice.api.repositories.SessaoRepository;

@Service
public class SaltoService {

    @Autowired
    private SaltoRepository saltoRepository;

    @Autowired
    private SessaoRepository sessaoRepository;

    public List<Salto> listarTodos() {
        return saltoRepository.findAll();
    }

    public Optional<Salto> buscarPorId(Long id) {
        return saltoRepository.findById(id);
    }
    
    public List<Salto> buscarPorSessaoId(Long sessaoId) {
        return saltoRepository.findBySessaoId(sessaoId);
    }

    public Salto criar(SaltoDTO dto) {
        Sessao sessao = sessaoRepository.findById(dto.getSessaoId())
                .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada."));

        Salto salto = new Salto();
        salto.setSessao(sessao);
        salto.setTimestampSalto(dto.getTimestampSalto());
        salto.setTempoVooMs(dto.getTempoVooMs());
        salto.setAlturaEstimadaCm(dto.getAlturaEstimadaCm());
        salto.setAceleracaoPicoZ(dto.getAceleracaoPicoZ());

        return saltoRepository.save(salto);
    }

    public Optional<Salto> atualizar(Long id, SaltoDTO dto) {
        return saltoRepository.findById(id)
                .map(saltoExistente -> {
                    Sessao sessao = sessaoRepository.findById(dto.getSessaoId())
                            .orElseThrow(() -> new IllegalArgumentException("Sessão não encontrada."));
                    
                    saltoExistente.setSessao(sessao);
                    saltoExistente.setTimestampSalto(dto.getTimestampSalto());
                    saltoExistente.setTempoVooMs(dto.getTempoVooMs());
                    saltoExistente.setAlturaEstimadaCm(dto.getAlturaEstimadaCm());
                    saltoExistente.setAceleracaoPicoZ(dto.getAceleracaoPicoZ());
                    
                    return saltoRepository.save(saltoExistente);
                });
    }

    public boolean deletar(Long id) {
        if (saltoRepository.existsById(id)) {
            saltoRepository.deleteById(id);
            return true;
        }
        return false;
    }
}