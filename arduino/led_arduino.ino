// 시리얼로 G / Y / R 문자를 받으면 해당 LED 점등 (나머지는 끔)
// 스캔 화면(src/lib/led.ts)이 Web Serial로 판정 결과를 보낸다. Arduino IDE로 보드에 업로드
const int PIN_G = 9, PIN_Y = 10, PIN_R = 11;

void light(int pin) {
  digitalWrite(PIN_G, LOW); digitalWrite(PIN_Y, LOW); digitalWrite(PIN_R, LOW);
  digitalWrite(pin, HIGH);
}

void setup() {
  Serial.begin(9600);
  pinMode(PIN_G, OUTPUT); pinMode(PIN_Y, OUTPUT); pinMode(PIN_R, OUTPUT);
  // 시작 시 배선 확인: 초록 → 노랑 → 빨강 순서로 0.3초씩 켰다 끔
  light(PIN_G); delay(300); light(PIN_Y); delay(300); light(PIN_R); delay(300);
  digitalWrite(PIN_R, LOW);
}

void loop() {
  if (Serial.available()) {
    char c = toupper(Serial.read());  // 소문자도 허용
    if (c == 'G') light(PIN_G);
    else if (c == 'Y') light(PIN_Y);
    else if (c == 'R') light(PIN_R);
    else return;
    Serial.print("LED ");              // 받은 값 확인용 (시리얼 모니터에 표시)
    Serial.println(c);
  }
}
