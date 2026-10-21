import { api } from '@/api/client';
import type { ScanCreated, ScanDetail } from '@/types/api';

// 스캔 등록: QR 문자열 + 인식 순간 프레임. 판정은 백엔드에서 비동기로 진행
export async function createScan(qr: string, frame: Blob) {
  const form = new FormData();
  form.append('qr', qr);
  form.append('image', frame, 'frame.jpg'); // 백엔드가 확장자로 이미지 형식을 검사
  const { data } = await api.post<ScanCreated>('/scans', form, {
    headers: { 'X-Station-Key': import.meta.env.VITE_STATION_KEY ?? '' },
  });
  return data;
}

export async function getScan(scanId: number) {
  const { data } = await api.get<ScanDetail>(`/scans/${scanId}`);
  return data;
}
