// 시리얼로 G / Y / R 문자를 받으면 8x8 RGB LED 매트릭스(WS2812B, 64개) 전체를 해당 색으로 점등, O를 받으면 소등
// 스캔 화면(src/lib/led.ts)이 Web Serial로 판정 결과를 보낸다. Arduino IDE로 보드에 업로드
// 필요 라이브러리: Adafruit NeoPixel (Arduino IDE > 라이브러리 관리자에서 설치)
#include <Adafruit_NeoPixel.h>

const int PIN_DATA = 6;        // 매트릭스 DIN 연결 핀 (배선에 맞게 수정)
const int NUM_LEDS = 64;       // 8 x 8
const uint8_t BRIGHTNESS = 30; // 0~255. 64개 전체 점등은 전류가 커서 낮게 유지 (USB 전원 보호)

Adafruit_NeoPixel matrix(NUM_LEDS, PIN_DATA, NEO_GRB + NEO_KHZ800);

const uint32_t COLOR_G = matrix.Color(0, 255, 0);
const uint32_t COLOR_Y = matrix.Color(255, 100, 0);  // 노랑은 R+G 혼합이라 G를 낮춰야 노랗게 보임
const uint32_t COLOR_R = matrix.Color(255, 0, 0);

void showColor(uint32_t color) {
  matrix.fill(color, 0, NUM_LEDS);
  matrix.show();
}

void setup() {
  Serial.begin(9600);
  matrix.begin();
  matrix.setBrightness(BRIGHTNESS);
  // 시작 시 배선 확인: 초록 → 노랑 → 빨강 순서로 0.3초씩 켰다 끔
  showColor(COLOR_G); delay(300);
  showColor(COLOR_Y); delay(300);
  showColor(COLOR_R); delay(300);
  matrix.clear();
  matrix.show();
}

void loop() {
  if (Serial.available()) {
    char c = toupper(Serial.read());  // 소문자도 허용
    if (c == 'G') showColor(COLOR_G);
    else if (c == 'Y') showColor(COLOR_Y);
    else if (c == 'R') showColor(COLOR_R);
    else if (c == 'O') { matrix.clear(); matrix.show(); }  // 시나리오 화면 등에서 소등
    else return;
    Serial.print("LED ");              // 받은 값 확인용 (시리얼 모니터에 표시)
    Serial.println(c);
  }
}
