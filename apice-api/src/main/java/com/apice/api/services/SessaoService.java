package com.apice.api.services;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.apice.api.dto.SessaoDTO;
import com.apice.api.entities.Atleta;
import com.apice.api.entities.Sessao;
import com.apice.api.repositories.AtletaRepository;
import com.apice.api.repositories.SessaoRepository;

@Service
public class SessaoService {

    @Autowired
    private SessaoRepository sessaoRepository;

    @Autowired
    private AtletaRepository atletaRepository;

    public List<Sessao> listarTodas() {
        return sessaoRepository.findAll();
    }

    public Optional<Sessao> buscarPorId(Long id) {
        return sessaoRepository.findById(id);
    }
    
    public List<Sessao> buscarPorAtletaId(Long atletaId) {
        return sessaoRepository.findByAtletaId(atletaId);
    }

    public Sessao criar(SessaoDTO dto) {
        // Valida se o atleta existe no banco de dados antes de criar a sessão
        Atleta atleta = atletaRepository.findById(dto.getAtletaId())
                .orElseThrow(() -> new IllegalArgumentException("Atleta não encontrado."));

        Sessao sessao = new Sessao();
        sessao.setAtleta(atleta);
        sessao.setDataHoraInicio(dto.getDataHoraInicio());
        sessao.setDataHoraFim(dto.getDataHoraFim());
        sessao.setObservacoes(dto.getObservacoes());

        return sessaoRepository.save(sessao);
    }

    public Optional<Sessao> atualizar(Long id, SessaoDTO dto) {
        return sessaoRepository.findById(id)
                .map(sessaoExistente -> {
                    // Valida o novo atleta se o ID tiver mudado
                    Atleta atleta = atletaRepository.findById(dto.getAtletaId())
                            .orElseThrow(() -> new IllegalArgumentException("Atleta não encontrado."));
                    
                    sessaoExistente.setAtleta(atleta);
                    sessaoExistente.setDataHoraInicio(dto.getDataHoraInicio());
                    sessaoExistente.setDataHoraFim(dto.getDataHoraFim());
                    sessaoExistente.setObservacoes(dto.getObservacoes());
                    return sessaoRepository.save(sessaoExistente);
                });
    }

    public boolean deletar(Long id) {
        if (sessaoRepository.existsById(id)) {
            sessaoRepository.deleteById(id);
            return true;
        }
        return false;
    }
}