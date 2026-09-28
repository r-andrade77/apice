package com.apice.api.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.LocalDateTime;

public class SaltoDTO {

    @NotNull(message = "O ID da sessão é obrigatório.")
    private Long sessaoId;

    @NotNull(message = "O timestamp do salto é obrigatório.")
    private LocalDateTime timestampSalto;

    @NotNull(message = "O tempo de voo é obrigatório.")
    @PositiveOrZero(message = "O tempo de voo não pode ser negativo.")
    private Integer tempoVooMs;

    @NotNull(message = "A altura estimada é obrigatória.")
    private Double alturaEstimadaCm;

    @NotNull(message = "A aceleração de pico Z é obrigatória.")
    private Double aceleracaoPicoZ;

    public SaltoDTO() {
    }

    // Getters e Setters
    public Long getSessaoId() {
        return sessaoId;
    }

    public void setSessaoId(Long sessaoId) {
        this.sessaoId = sessaoId;
    }

    public LocalDateTime getTimestampSalto() {
        return timestampSalto;
    }

    public void setTimestampSalto(LocalDateTime timestampSalto) {
        this.timestampSalto = timestampSalto;
    }

    public Integer getTempoVooMs() {
        return tempoVooMs;
    }

    public void setTempoVooMs(Integer tempoVooMs) {
        this.tempoVooMs = tempoVooMs;
    }

    public Double getAlturaEstimadaCm() {
        return alturaEstimadaCm;
    }

    public void setAlturaEstimadaCm(Double alturaEstimadaCm) {
        this.alturaEstimadaCm = alturaEstimadaCm;
    }

    public Double getAceleracaoPicoZ() {
        return aceleracaoPicoZ;
    }

    public void setAceleracaoPicoZ(Double aceleracaoPicoZ) {
        this.aceleracaoPicoZ = aceleracaoPicoZ;
    }
}