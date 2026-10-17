// API 연결 전 QR → 목업 스캔 변환. 연결 후에는 POST /scans 응답으로 대체
import { mockChipScan, mockContamScan, mockScan } from '@/mocks/data';
import type { ScanDetail } from '@/types/api';

const BY_SHAPE: Record<string, ScanDetail> = {
  LUMP: mockScan,
  CHIP: mockChipScan,
  CONTAM: mockContamScan,
};

// 형식 오류면 백엔드와 같은 문구를 throw
export function mockScanFromQr(text: string): ScanDetail {
  let qr: Record<string, unknown>;
  try {
    qr = JSON.parse(text);
  } catch {
    throw new Error('QR 형식이 올바르지 않습니다.');
  }
  const base = typeof qr === 'object' && qr ? BY_SHAPE[qr.shape as string] : undefined;
  if (!base || typeof qr.lot !== 'string' || typeof qr.grade !== 'string') {
    throw new Error('QR 형식이 올바르지 않습니다.');
  }
  return {
    ...base,
    lot: {
      ...base.lot,
      lot_id: qr.lot,
      grade: qr.grade,
      ...((qr.fam === 'Ti' || qr.fam === 'Al') && { fam: qr.fam }),
      ...(typeof qr.temper === 'string' && { temper: qr.temper }),
      ...(qr.cert != null && { cert: qr.cert === 1 }),
    },
    created_at: new Date().toISOString(),
  };
}
