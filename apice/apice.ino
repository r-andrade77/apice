#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <ArduinoJson.h>

// Credenciais da rede Wi-Fi
const char* ssid = "NOME_DA_TUA_REDE_WIFI";
const char* password = "SENHA_DA_TUA_REDE_WIFI";

// Endereço da API Java (Substituir pelo IP local do teu computador onde o Spring Boot está a correr)
// Exemplo: http://192.168.1.100:8080/api/saltos
const String apiUrl = "http://SEU_IP_LOCAL:8080/api/saltos";

// ID da sessão previamente criada na API (Muda conforme o que estiver na base de dados)
const int idSessaoAtual = 1; 

Adafruit_MPU6050 mpu;

void setup() {
  Serial.begin(115200);
  while (!Serial) delay(10); 

  // Inicialização do MPU-6050
  if (!mpu.begin()) {
    Serial.println("Falha ao encontrar o sensor MPU6050. Verifica as ligações!");
    while (1) delay(10);
  }
  Serial.println("MPU6050 inicializado com sucesso!");
  
  mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
  mpu.setGyroRange(MPU6050_RANGE_2000_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  // Ligação ao Wi-Fi
  WiFi.begin(ssid, password);
  Serial.print("A ligar ao Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nLigado à rede Wi-Fi com sucesso!");
  Serial.print("Endereço IP do ESP32: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Apenas simulará o envio de um salto se o ESP32 estiver ligado ao Wi-Fi
  if (WiFi.status() == WL_CONNECTED) {
    
    // Ler os dados reais do sensor MPU6050
    sensors_event_t a, g, temp;
    mpu.getEvent(&a, &g, &temp);

    // Para fins de teste de integração com a API, vamos simular a deteção de um salto
    // Num cenário real, aplicarias aqui os teus filtros digitais e calcularia o tempo de voo real
    float aceleracaoPicoZReal = a.acceleration.z; 
    int tempoVooSimuladoMs = 450; 
    float alturaEstimadaSimulada = 24.8; // Altura calculada pelo tempo de voo[cite: 1]

    // Criar o documento JSON com as chaves exatas do SaltoDTO em Java
    StaticJsonDocument<256> jsonDoc;
    jsonDoc["sessaoId"] = idSessaoAtual;
    // O ESP32 não tem relógio RTC embutido sem configuração NTP. Para teste, enviamos uma string fixa ou configuramos NTP.
    // Assumiremos uma string fixa de teste, mas num projeto final, usa o cliente NTP para gerar o Timestamp ISO 8601 real.
    jsonDoc["timestampSalto"] = "2026-09-27T10:00:00"; 
    jsonDoc["tempoVooMs"] = tempoVooSimuladoMs;
    jsonDoc["alturaEstimadaCm"] = alturaEstimadaSimulada;
    jsonDoc["aceleracaoPicoZ"] = aceleracaoPicoZReal;

    String requestBody;
    serializeJson(jsonDoc, requestBody);

    // Enviar o POST para a API Java
    HTTPClient http;
    http.begin(apiUrl);
    http.addHeader("Content-Type", "application/json");

    Serial.println("A enviar dados do salto para a API...");
    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0) {
      Serial.print("Código de resposta HTTP: ");
      Serial.println(httpResponseCode);
      String response = http.getString();
      Serial.println("Resposta do servidor: " + response);
    } else {
      Serial.print("Erro na requisição. Código de erro HTTPClient: ");
      Serial.println(httpResponseCode);
    }
    
    http.end();
    
    // Aguardar 10 segundos antes de simular o próximo salto
    delay(10000); 
  } else {
    Serial.println("Aviso: Wi-Fi desconectado.");
  }
}