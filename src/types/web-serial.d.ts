// Web Serial API 최소 타입 (TS 기본 DOM 타입에 없음). LED 아두이노 연결용
interface SerialPort extends EventTarget {
  open(options: { baudRate: number }): Promise<void>;
  readonly writable: WritableStream<Uint8Array> | null;
}

interface Serial extends EventTarget {
  requestPort(): Promise<SerialPort>;
  getPorts(): Promise<SerialPort[]>;
}

interface Navigator {
  readonly serial?: Serial;
}
