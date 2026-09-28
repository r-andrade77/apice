package com.apice.api.dto;

import java.time.LocalDateTime;

import jakarta.validation.constraints.NotNull;

public class SessaoDTO {

    @NotNull(message = "O ID do atleta é obrigatório.")
    private Long atletaId;

    @NotNull(message = "A data e hora de início são obrigatórias.")
    private LocalDateTime dataHoraInicio;

    private LocalDateTime dataHoraFim;

    private String observacoes;

    public SessaoDTO() {
    }

    // Getters e Setters
    public Long getAtletaId() {
        return atletaId;
    }

    public void setAtletaId(Long atletaId) {
        this.atletaId = atletaId;
    }

    public LocalDateTime getDataHoraInicio() {
        return dataHoraInicio;
    }

    public void setDataHoraInicio(LocalDateTime dataHoraInicio) {
        this.dataHoraInicio = dataHoraInicio;
    }

    public LocalDateTime getDataHoraFim() {
        return dataHoraFim;
    }

    public void setDataHoraFim(LocalDateTime dataHoraFim) {
        this.dataHoraFim = dataHoraFim;
    }

    public String getObservacoes() {
        return observacoes;
    }

    public void setObservacoes(String observacoes) {
        this.observacoes = observacoes;
    }
}