package com.apice.api.security;

import java.util.Arrays;
import java.util.List;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
public class CorsConfig {

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();

        // Origens permitidas (ex: React, Angular, Vue, Flutter Web, Dashboard local)
        // Em ambiente de produção, substitua pelo domínio exato (ex: "https://meudashboard.com")
        configuration.setAllowedOriginPatterns(List.of("*")); 

        // Métodos HTTP autorizados para acesso externo
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));

        // Cabeçalhos HTTP permitidos nas requisições
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));

        // Permite o envio de credenciais (cookies, tokens de autenticação ou headers de HTTP Basic)
        configuration.setAllowCredentials(true);

        // Cabeçalhos que a API expõe na resposta para o cliente web ler
        configuration.setExposedHeaders(List.of("Authorization"));

        // Tempo em segundos que a resposta de pré-checagem (OPTIONS) fica em cache no navegador
        configuration.setMaxAge(3600L);

        // Aplica a configuração a todos os caminhos da API
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}