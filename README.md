# Ápice

## Envio de saltos por Wi-Fi

1. Inicie a API Spring Boot e abra o painel no computador da API. O painel local consulta `http://localhost:8080`. Cadastre o atleta, crie uma sessão e anote o ID da sessão.
2. Copie `apice/configuracao.exemplo.h` para `apice/configuracao.h`. Preencha a rede Wi-Fi, a senha, o ID da sessão e a URL `http://IP-DA-API:8080/api/saltos`. Use o endereço da máquina da API acessível pelo ESP32 na rede.
3. No Arduino IDE, selecione a placa e a porta do ESP32, instale a biblioteca Adafruit MPU6050 com suas dependências e grave `apice/apice.ino`. Abra o monitor serial em 115200 baud e aguarde a sincronização do relógio por NTP.
4. Faça um salto com o sensor fixado e o eixo Z orientado na vertical. Após a aterrissagem, confira o HTTP 201 no monitor serial e o registro em **Captações** ou na página da sessão. O painel consulta a API a cada 15 segundos enquanto a página está visível.

O ESP32 envia o horário local de Brasília, o tempo de voo em milissegundos, a altura estimada em centímetros e o pico absoluto da aceleração no eixo Z em m/s². A altura é calculada por `g × tempo_de_voo² / 8`, com o tempo em segundos. Os limiares de detecção são iniciais e precisam de validação com o dispositivo montado. A fila de envio é mantida em memória. Uma requisição sem confirmação é registrada no monitor serial e exige conferência no painel antes de qualquer reenvio.
