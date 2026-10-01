package com.apice.api.entities;

import java.time.LocalDate;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Positive;

@Entity
@Table(name = "atleta")
public class Atleta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "O nome é obrigatório")
    @Column(nullable = false, length = 100)
    private String nome;

    @NotNull(message = "A data de nascimento é obrigatória")
    @Past(message = "A data de nascimento deve estar no passado")
    @Column(name = "data_nascimento")
    private LocalDate dataNascimento;

    @NotNull(message = "O peso é obrigatório")
    @Positive(message = "O peso deve ser positivo")
    @Column(name = "peso_kg")
    private Double pesoKg;

    @NotNull(message = "A altura é obrigatória")
    @Positive(message = "A altura deve ser positiva")
    @Column(name = "altura_cm")
    private Integer alturaCm;
    
    @OneToMany(mappedBy = "atleta")
    private List<Sessao> sessoes;

    // Construtor padrão exigido pelo JPA
    public Atleta() {
    }

    // Construtor completo
    public Atleta(Long id, String nome, LocalDate dataNascimento, Double pesoKg, Integer alturaCm) {
        this.id = id;
        this.nome = nome;
        this.dataNascimento = dataNascimento;
        this.pesoKg = pesoKg;
        this.alturaCm = alturaCm;
    }

    // Getters e Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public LocalDate getDataNascimento() {
        return dataNascimento;
    }

    public void setDataNascimento(LocalDate dataNascimento) {
        this.dataNascimento = dataNascimento;
    }

    public Double getPesoKg() {
        return pesoKg;
    }

    public void setPesoKg(Double pesoKg) {
        this.pesoKg = pesoKg;
    }

    public Integer getAlturaCm() {
        return alturaCm;
    }

    public void setAlturaCm(Integer alturaCm) {
        this.alturaCm = alturaCm;
    }
}