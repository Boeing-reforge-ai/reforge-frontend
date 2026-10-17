// API 연결 전 QR → 목업 스캔 변환. 연결 후에는 POST /scans 응답으로 대체
import { NO_TAG_PREFIX } from '@/lib/criteria';
import { mockContamScan, mockScan, mockYellowScan } from '@/mocks/data';
import type { ScanDetail } from '@/types/api';

// 시제품 로트 → 백엔드 판정 결과 목업 (T1 초록, T2 노랑, T4 빨강)
const BY_LOT: Record<string, ScanDetail> = {
  [mockScan.lot.lot_id]: mockScan,
  [mockYellowScan.lot.lot_id]: mockYellowScan,
  [mockContamScan.lot.lot_id]: mockContamScan,
};

// lot 키가 없으면 태그 분실 → 노랑 (XRF 확인)
const tagMissing = (base: ScanDetail): ScanDetail => ({
  ...base,
  lot: { ...base.lot, lot_id: `${NO_TAG_PREFIX}DEMO0001` },
  led: 'Y',
  screening: 'YELLOW',
  reusable: false,
  reason_codes: [...base.reason_codes, 'tag_missing'],
  yellow_actions: [
    ...base.yellow_actions,
    { action: 'XRF로 합금 확인 (로트 없음 → 성적서 필요 후보 불가)', items: ['태그 분실 (로트 미확인)'] },
  ],
});

// 형식 오류면 백엔드와 같은 문구를 throw
export function mockScanFromQr(text: string): ScanDetail {
  let qr: Record<string, unknown>;
  try {
    qr = JSON.parse(text);
  } catch {
    throw new Error('QR 형식이 올바르지 않습니다.');
  }
  if (typeof qr !== 'object' || !qr || (qr.shape !== 'LUMP' && qr.shape !== 'CONTAM') || typeof qr.grade !== 'string') {
    throw new Error('QR 형식이 올바르지 않습니다.');
  }
  const created_at = new Date().toISOString();
  if (typeof qr.lot !== 'string') return { ...tagMissing(qr.shape === 'CONTAM' ? mockContamScan : mockScan), created_at };

  // 시제품이 아니면 유형만 맞춰 보여줌 (판정값은 시제품 목업 기준)
  const base = BY_LOT[qr.lot] ?? (qr.shape === 'CONTAM' ? mockContamScan : mockScan);
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
    created_at,
  };
}
