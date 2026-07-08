// toygarden-m5.ino — M5StickC Plus を toygarden の実機パネルにするファームウェア
//
// プロトコル: USB serial 115200 baud・改行区切り JSON
//   受信: {"op":"clear"} / {"op":"text","x":N,"y":N,"text":"..."}
//         {"op":"rect","x":N,"y":N,"w":N,"h":N,"color":[r,g,b]}
//         {"op":"led","r":N,"g":N,"b":N} / {"op":"flush"}
//   送信: 起動時 {"hello":"toygarden","w":240,"h":135}
//         ボタン {"btn":0}(A) {"btn":1}(B)
//
// 描画はオフスクリーンスプライトに行い flush で一括転送（ちらつき防止）。
// StickC Plus の LED は単色(赤・GPIO10・LOW点灯)なので、led は「どれかの
// チャンネル>0 なら点灯」に落とす。

#include <M5StickCPlus.h>
#include <ArduinoJson.h>

TFT_eSprite canvas = TFT_eSprite(&M5.Lcd);

const int LED_PIN = 10; // StickC Plus 内蔵赤LED (LOW=点灯)
String line;

uint16_t rgb565(int r, int g, int b) {
  return canvas.color565(r, g, b);
}

void setup() {
  M5.begin();
  M5.Lcd.setRotation(3); // 横向き 240x135
  canvas.createSprite(240, 135);
  canvas.fillSprite(TFT_BLACK);
  canvas.setTextColor(TFT_WHITE, TFT_BLACK);
  canvas.setTextSize(1);
  canvas.pushSprite(0, 0);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, HIGH); // 消灯

  Serial.begin(115200);
  line.reserve(512);
  Serial.println("{\"hello\":\"toygarden\",\"w\":240,\"h\":135}");

  // 起動スプラッシュ（接続待ちの顔）
  canvas.setTextSize(2);
  canvas.setCursor(24, 50);
  canvas.print("toygarden");
  canvas.setTextSize(1);
  canvas.setCursor(24, 80);
  canvas.print("waiting for toys...");
  canvas.pushSprite(0, 0);
  canvas.setTextSize(1);
}

void handleCommand(const String &json) {
  StaticJsonDocument<768> doc;
  if (deserializeJson(doc, json) != DeserializationError::Ok) {
    Serial.println("{\"err\":\"parse\"}");
    return;
  }
  const char *op = doc["op"] | "";
  Serial.print("{\"ack\":\"");
  Serial.print(op);
  Serial.println("\"}");

  if (strcmp(op, "clear") == 0) {
    canvas.fillSprite(TFT_BLACK);
  } else if (strcmp(op, "text") == 0) {
    int x = doc["x"] | 0;
    int y = doc["y"] | 0;
    const char *text = doc["text"] | "";
    canvas.setCursor(x, y);
    canvas.setTextColor(TFT_WHITE);
    // 非ASCIIバイトはフォント処理がwatchdogリセットを起こす(実測: TG1WDT_SYS_RESET)。
    // 印字可能ASCIIだけ通し、それ以外は '?' に落とす。
    for (const char *p = text; *p; p++) {
      char c = *p;
      canvas.print((c >= 0x20 && c <= 0x7e) ? c : '?');
    }
  } else if (strcmp(op, "rect") == 0) {
    int x = doc["x"] | 0;
    int y = doc["y"] | 0;
    int w = doc["w"] | 0;
    int h = doc["h"] | 0;
    uint16_t c = TFT_WHITE;
    if (doc["color"].is<JsonArray>()) {
      JsonArray col = doc["color"].as<JsonArray>();
      c = rgb565(col[0] | 255, col[1] | 255, col[2] | 255);
    }
    canvas.fillRect(x, y, w, h, c);
  } else if (strcmp(op, "led") == 0) {
    int r = doc["r"] | 0, g = doc["g"] | 0, b = doc["b"] | 0;
    digitalWrite(LED_PIN, (r + g + b) > 0 ? LOW : HIGH);
  } else if (strcmp(op, "flush") == 0) {
    canvas.pushSprite(0, 0);
  }
}

void loop() {
  M5.update();
  if (M5.BtnA.wasPressed()) Serial.println("{\"btn\":0}");
  if (M5.BtnB.wasPressed()) Serial.println("{\"btn\":1}");

  while (Serial.available()) {
    char ch = (char)Serial.read();
    if (ch == '\n') {
      handleCommand(line);
      line = "";
    } else if (line.length() < 500) {
      line += ch;
    }
  }
}
