package com.apice.api.entities;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "salto")
public class Salto {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Relacionamento com a entidade Sessao
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sessao_id", nullable = false)
    private Sessao sessao;

    @Column(name = "timestamp_salto", nullable = false)
    private LocalDateTime timestampSalto;

    @Column(name = "tempo_voo_ms")
    private Integer tempoVooMs;

    @Column(name = "altura_estimada_cm")
    private Double alturaEstimadaCm;

    @Column(name = "aceleracao_pico_z")
    private Double aceleracaoPicoZ;

    // Construtor padrão
    public Salto() {
    }

    // Construtor completo
    public Salto(Long id, Sessao sessao, LocalDateTime timestampSalto, Integer tempoVooMs, Double alturaEstimadaCm, Double aceleracaoPicoZ) {
        this.id = id;
        this.sessao = sessao;
        this.timestampSalto = timestampSalto;
        this.tempoVooMs = tempoVooMs;
        this.alturaEstimadaCm = alturaEstimadaCm;
        this.aceleracaoPicoZ = aceleracaoPicoZ;
    }

    // Getters e Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Sessao getSessao() {
        return sessao;
    }

    public void setSessao(Sessao sessao) {
        this.sessao = sessao;
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