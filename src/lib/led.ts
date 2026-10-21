// 스캔 스테이션 LED 아두이노(arduino/led_arduino.ino)를 Web Serial로 제어
// 페이지를 옮겨도 연결이 유지되도록 모듈 단위로 포트를 하나만 둔다
import { useSyncExternalStore } from 'react';
import type { Led } from '@/types/api';

export type LedStatus = 'unsupported' | 'disconnected' | 'connecting' | 'connected';

const BAUD_RATE = 9600;
const BOOT_MS = 2000; // 포트를 열면 아두이노가 재부팅됨 → 그동안 보낸 글자는 유실

const serial = navigator.serial;
let status: LedStatus = serial ? 'disconnected' : 'unsupported';
let port: SerialPort | null = null;
const listeners = new Set<() => void>();

function setStatus(next: LedStatus) {
  status = next;
  listeners.forEach((l) => l());
}

async function open(p: SerialPort) {
  setStatus('connecting');
  try {
    await p.open({ baudRate: BAUD_RATE });
    port = p;
    await new Promise((r) => setTimeout(r, BOOT_MS));
    setStatus('connected');
  } catch {
    setStatus(port ? 'connected' : 'disconnected');
  }
}

// 버튼 클릭에서 호출 (포트 선택 창은 사용자 조작이 있어야 열림)
export async function connectLed() {
  if (!serial) return;
  try {
    await open(await serial.requestPort());
  } catch {
    // 사용자가 선택 창을 닫음
  }
}

// 이전에 허용한 포트는 사용자 조작 없이 다시 연결
export async function restoreLed() {
  if (!serial || port) return;
  const [p] = await serial.getPorts();
  if (p) await open(p);
}

// 판정 결과 LED 점등. 연결 안 됐으면 무시
export async function sendLed(led: Led) {
  if (status !== 'connected' || !port?.writable) return;
  const writer = port.writable.getWriter();
  try {
    await writer.write(new TextEncoder().encode(led));
  } finally {
    writer.releaseLock();
  }
}

serial?.addEventListener('disconnect', (e) => {
  if (e.target === port) {
    port = null;
    setStatus('disconnected');
  }
});

export function useLedStatus() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}
