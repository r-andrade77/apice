#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <cmath>
#include <ctime>

#if __has_include("configuracao.h")
#include "configuracao.h"
#else
constexpr char WIFI_SSID[] = "";
constexpr char WIFI_SENHA[] = "";
constexpr char API_SALTOS[] = "";
constexpr long long SESSAO_ID = 0;
#endif

constexpr float GRAVIDADE = 9.80665f;
constexpr float LIMIAR_IMPULSAO = 1.3f * GRAVIDADE;
constexpr float LIMIAR_VOO = 0.6f * GRAVIDADE;
constexpr float LIMIAR_ATERRISSAGEM = 1.4f * GRAVIDADE;
constexpr uint32_t AMOSTRA_MS = 10;
constexpr uint32_t CONFIRMACAO_VOO_MS = 30;
constexpr uint32_t VOO_MIN_MS = 120;
constexpr uint32_t VOO_MAX_MS = 1000;
constexpr uint32_t JANELA_IMPULSAO_MS = 350;
constexpr uint32_t PAUSA_APOS_IMPACTO_MS = 300;

struct Salto {
  time_t instante;
  uint32_t vooMs;
  float picoZ;
};

enum class Fase { repouso, impulsao, confirmandoVoo, voo, recuperacao };

Adafruit_MPU6050 mpu;
QueueHandle_t filaSaltos;

void enviarSaltos(void*) {
  Salto salto;
  while (true) {
    if (xQueueReceive(filaSaltos, &salto, portMAX_DELAY) != pdTRUE) continue;

    const uint32_t esperaDesde = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - esperaDesde < 30000) {
      delay(250);
    }
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("Salto descartado: Wi-Fi indisponível por 30 s.");
      continue;
    }

    tm horaLocal{};
    localtime_r(&salto.instante, &horaLocal);
    char timestamp[20];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%S", &horaLocal);
    const float vooSegundos = salto.vooMs / 1000.0f;
    const float alturaCm = GRAVIDADE * vooSegundos * vooSegundos * 100.0f / 8.0f;

    char corpo[256];
    snprintf(corpo, sizeof(corpo),
             "{\"sessaoId\":%lld,\"timestampSalto\":\"%s\",\"tempoVooMs\":%lu,"
             "\"alturaEstimadaCm\":%.2f,\"aceleracaoPicoZ\":%.3f}",
             SESSAO_ID, timestamp, static_cast<unsigned long>(salto.vooMs),
             alturaCm, salto.picoZ);

    WiFiClient conexao;
    HTTPClient http;
    if (!http.begin(conexao, API_SALTOS)) {
      Serial.println("Falha ao iniciar HTTP. Confira API_SALTOS.");
      continue;
    }
    http.setConnectTimeout(3000);
    http.setTimeout(3000);
    http.addHeader("Content-Type", "application/json");
    const int codigo = http.POST(String(corpo));
    if (codigo == 201) {
      Serial.printf("Salto registrado: %lu ms, %.2f cm (HTTP 201).\n",
                    static_cast<unsigned long>(salto.vooMs), alturaCm);
    } else {
      // Uma falha de transporte pode ocorrer depois de a API salvar o salto.
      Serial.printf("Salto sem confirmação (HTTP %d). Confira a API e a sessão.\n", codigo);
    }
    http.end();
  }
}

void setup() {
  Serial.begin(115200);
  if (WIFI_SSID[0] == '\0' || API_SALTOS[0] == '\0' || SESSAO_ID <= 0) {
    Serial.println("Preencha configuracao.h com Wi-Fi, URL da API e ID da sessão.");
    return;
  }
  if (!mpu.begin()) {
    Serial.println("MPU-6050 indisponível. Confira a ligação I2C.");
    return;
  }

  mpu.setAccelerometerRange(MPU6050_RANGE_16_G);
  mpu.setGyroRange(MPU6050_RANGE_2000_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
  // A API usa LocalDateTime, e o painel interpreta a hora como local.
  configTzTime("BRT3", "pool.ntp.org", "time.google.com");

  filaSaltos = xQueueCreate(16, sizeof(Salto));
  if (filaSaltos == nullptr ||
      xTaskCreate(enviarSaltos, "enviarSaltos", 8192, nullptr, 1, nullptr) != pdPASS) {
    if (filaSaltos != nullptr) vQueueDelete(filaSaltos);
    filaSaltos = nullptr;
    Serial.println("Falha ao inicializar o envio de saltos.");
    return;
  }
  Serial.println("Captura iniciada. Aguardando conexão e sincronização do relógio.");
}

void loop() {
  delay(AMOSTRA_MS);
  if (filaSaltos == nullptr) return;

  static Fase fase = Fase::repouso;
  static uint32_t inicioFase = 0;
  static uint32_t inicioVoo = 0;
  static float picoZ = 0;
  static bool relogioPronto = false;

  if (!relogioPronto) {
    if (time(nullptr) < 1704067200) return;
    relogioPronto = true;
    Serial.println("Relógio sincronizado. Pronto para registrar saltos.");
  }

  sensors_event_t aceleracao, rotacao, temperatura;
  if (!mpu.getEvent(&aceleracao, &rotacao, &temperatura)) {
    fase = Fase::repouso;
    return;
  }

  const uint32_t agora = millis();
  const float x = aceleracao.acceleration.x;
  const float y = aceleracao.acceleration.y;
  const float z = aceleracao.acceleration.z;
  const float modulo = sqrtf(x * x + y * y + z * z);
  const float intensidadeZ = fabsf(z);

  if (fase == Fase::impulsao || fase == Fase::confirmandoVoo || fase == Fase::voo) {
    picoZ = fmaxf(picoZ, intensidadeZ);
  }

  switch (fase) {
    case Fase::repouso:
      if (modulo >= LIMIAR_IMPULSAO) {
        inicioFase = agora;
        picoZ = intensidadeZ;
        fase = Fase::impulsao;
      }
      break;
    case Fase::impulsao:
      if (agora - inicioFase > JANELA_IMPULSAO_MS) {
        fase = Fase::repouso;
      } else if (modulo <= LIMIAR_VOO) {
        inicioVoo = agora;
        fase = Fase::confirmandoVoo;
      }
      break;
    case Fase::confirmandoVoo:
      if (modulo > LIMIAR_VOO) {
        fase = Fase::impulsao;
      } else if (agora - inicioVoo >= CONFIRMACAO_VOO_MS) {
        fase = Fase::voo;
      }
      break;
    case Fase::voo: {
      const uint32_t vooMs = agora - inicioVoo;
      if (vooMs > VOO_MAX_MS || modulo >= LIMIAR_ATERRISSAGEM) {
        if (vooMs >= VOO_MIN_MS && vooMs <= VOO_MAX_MS) {
          const Salto salto{time(nullptr), vooMs, picoZ};
          if (xQueueSend(filaSaltos, &salto, 0) != pdTRUE) {
            Serial.println("Salto descartado: fila de envio cheia.");
          }
        }
        inicioFase = agora;
        fase = Fase::recuperacao;
      }
      break;
    }
    case Fase::recuperacao:
      if (agora - inicioFase >= PAUSA_APOS_IMPACTO_MS) fase = Fase::repouso;
      break;
  }
}
