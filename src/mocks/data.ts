// 분석 화면 DEMO 버튼(개발 모드)용 목업. 값은 시제품 T1·T2·T4의 실제 백엔드 계산 결과
import type { ScanDetail } from '@/types/api';

export const mockScan: ScanDetail = {
  scan_id: 1,
  status: 'done',
  progress: 100,
  image_url: null,
  lot: { lot_id: 'LOT-2026-0101', fam: 'Ti', grade: 'Ti-6Al-4V', temper: 'annealed', cert: true, ys: 828, ys_src: 'B' },
  measure: { dim_mm: [120, 80, 35], kg: 1.488, allow_mm: 0.5, qty: 1 },
  condition: {
    chem: 'IN', crack: 'none',
    foreign: 0.01, oil: 0.1, dust: 0.01,
    coat: 0, oxide: 1, corr: 0,
    scratch: 0.5, deform: 0.5, flags: [],
  },
  scrap_type: '덩어리형',
  led: 'G',
  condition_score: 96.7,
  screening: 'GREEN',
  needs_review: false,
  item_scores: { chem: 100, foreign: 96, surface: 95, oil: 90, coating: 100, struct: 95 },
  density_err: 0.0003,
  reason_codes: [],
  yellow_actions: [],
  reusable: true,
  error: null,
  created_at: '2026-10-20T05:32:10+00:00',
};

// 판정 중 (T1 등록 직후)
export const mockAnalyzingScan: ScanDetail = {
  ...mockScan,
  status: 'analyzing', progress: 50,
  condition_score: null, screening: null, item_scores: null, density_err: null, reusable: null,
};

// T2 산화된 Ti 블록 (노랑: 오일·산화·스크래치·변형이 가드밴드 진입)
export const mockYellowScan: ScanDetail = {
  ...mockScan,
  scan_id: 2,
  lot: { ...mockScan.lot, lot_id: 'LOT-2026-0102' },
  measure: { dim_mm: [70, 45, 18], kg: 0.251, allow_mm: 1.0, qty: 1 },
  condition: {
    chem: 'IN', crack: 'none', foreign: 0.01, oil: 0.4, dust: 0.01,
    coat: 0, oxide: 15, corr: 0, scratch: 3, deform: 3, flags: [],
  },
  led: 'Y',
  condition_score: 84.2,
  screening: 'YELLOW',
  item_scores: { chem: 100, foreign: 96, surface: 53.3, oil: 70, coating: 100, struct: 66.7 },
  density_err: 0.0007,
  reason_codes: ['oil_warn', 'oxide_warn', 'scratch_warn', 'deform_warn'],
  yellow_actions: [
    { action: '세척 후 재측정', items: ['오일 0.4wt.%'] },
    { action: '표면 절삭 후 치수 재확인', items: ['산화 15%', '스크래치 3%'] },
    { action: '평탄도 측정', items: ['변형 3%'] },
  ],
  reusable: false,
};

// T4 오염 Al 블록
export const mockContamScan: ScanDetail = {
  ...mockScan,
  scan_id: 4,
  lot: { lot_id: 'LOT-2026-0104', fam: 'Al', grade: 'Al-7075', temper: 'T6', cert: false, ys: null, ys_src: null },
  measure: { dim_mm: [100, 60, 20], kg: 0.337, allow_mm: null, qty: 1 },
  condition: {
    chem: null, crack: 'none', foreign: 0.02, oil: 1.5, dust: 0.03,
    coat: 40, oxide: 2, corr: 0, scratch: 1, deform: 0.5, flags: ['coat_hard'],
  },
  scrap_type: '오염형', led: 'R',
  condition_score: null, screening: 'RED', item_scores: null, density_err: 0.0006,
  reason_codes: ['oil_over', 'coat_hard'], reusable: false,
};
