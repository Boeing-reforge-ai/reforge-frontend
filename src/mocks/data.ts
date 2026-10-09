// API 연결 전 화면 확인용 목업. 값은 시제품 T1(깨끗한 Ti 블록)의 실제 백엔드 계산 결과
import type { Part, ProductionPlan, Proposal, ScanDetail, ScenarioResult } from '@/types/api';

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

// T3 Ti 칩
export const mockChipScan: ScanDetail = {
  ...mockScan,
  scan_id: 3,
  lot: { ...mockScan.lot, lot_id: 'LOT-2026-0103', ys: null, ys_src: null },
  measure: { dim_mm: null, kg: 0.15, allow_mm: null, qty: 1 },
  condition: null, scrap_type: '칩형', led: 'Y',
  condition_score: null, screening: null, item_scores: null, density_err: null, reusable: false,
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

export const mockParts: Part[] = [
  {
    part_id: 'C-01', name: '조립 치구', allowed_grades: ['Ti-6Al-4V'], temper: null, reheat_allowed: false,
    min_dims_mm: [100, 60, 25], min_ys: 600, cert_required: false, safety_critical: false,
    part_kg: 0.95, moq: 1, stage: 2, sell_price: 250000, sell_price_src: null, cost: 70000,
  },
  {
    part_id: 'C-02', name: '위성 브래킷 목업', allowed_grades: ['Ti-6Al-4V'], temper: null, reheat_allowed: false,
    min_dims_mm: [90, 50, 20], min_ys: 800, cert_required: true, safety_critical: false,
    part_kg: 0.45, moq: 1, stage: 2, sell_price: 300000, sell_price_src: null, cost: 115000,
  },
  {
    part_id: 'C-03', name: 'Ti 규격 블랭크', allowed_grades: ['Ti-6Al-4V'], temper: null, reheat_allowed: false,
    min_dims_mm: [60, 40, 15], min_ys: 828, cert_required: true, safety_critical: false,
    part_kg: null, moq: 1, stage: 4, sell_price: null, sell_price_src: null, cost: 0,
  },
];

export const mockPlans: ProductionPlan[] = [
  { plan_id: 1, part_id: 'C-01', part_name: '조립 치구', quantity: 5, due_date: '2026-10-27' },
  { plan_id: 2, part_id: 'C-01', part_name: '조립 치구', quantity: 7, due_date: '2026-11-10' },
  { plan_id: 3, part_id: 'C-02', part_name: '위성 브래킷 목업', quantity: 12, due_date: '2026-11-03' },
  { plan_id: 4, part_id: 'C-02', part_name: '위성 브래킷 목업', quantity: 8, due_date: '2026-11-17' },
  { plan_id: 5, part_id: 'C-03', part_name: 'Ti 규격 블랭크', quantity: 5, due_date: '2026-11-03' },
];

export const mockScenarios: ScenarioResult = {
  candidates: [
    { part_id: 'C-01', name: '조립 치구' },
    { part_id: 'C-02', name: '위성 브래킷 목업' },
    { part_id: 'C-03', name: 'Ti 규격 블랭크' },
  ],
  rejected: [],
  scenarios: [
    {
      scenario_id: 1, rank: 1, parts: [{ part_id: 'C-01', name: '조립 치구' }], usage: '지그',
      required_docs: ['원본 재질증명서 (LOT 성적서)', '치수 검사 성적서'],
      reason: '성적서 YS 828 MPa가 요구 600 MPa를 충족하고, 비행 부품이 아닌 공정 치구라 성적서 요건도 없습니다.',
      breakdown: { material: 35, geometry: 12.8, economics: 18, demand: 9, circularity: 4 },
      nrv: 180000, sell_price: 250000, score: 78.8,
    },
    {
      scenario_id: 2, rank: 2, parts: [{ part_id: 'C-02', name: '위성 브래킷 목업' }], usage: '목업',
      required_docs: ['원본 재질증명서 (LOT 성적서)'],
      reason: '성적서 YS 828 MPa가 요구 800 MPa를 충족하고 생산계획 수요가 가장 높습니다.',
      breakdown: { material: 35, geometry: 6, economics: 15.4, demand: 15, circularity: 4 },
      nrv: 185000, sell_price: 300000, score: 75.5,
    },
    {
      scenario_id: 3, rank: 3, parts: [{ part_id: 'C-03', name: 'Ti 규격 블랭크' }], usage: '보조도구',
      required_docs: ['원본 재질증명서 (LOT 성적서)'],
      reason: '표면 제거 후 가용 형상을 그대로 규격 블랭크로 판매해 형상 수율이 가장 높지만 수요가 낮습니다.',
      breakdown: { material: 35, geometry: 19, economics: 15, demand: 3.8, circularity: 2 },
      nrv: 30000, sell_price: 50000, score: 74.8,
    },
  ],
  baseline: { name: '신규 소재 구매', score: 0 },
  recommended_id: 1,
};

export const mockProposal: Proposal = {
  proposal_id: 1,
  scan_id: 1,
  scenario_id: 1,
  title: 'Ti-6Al-4V 자투리 조립 치구 전환 제안서',
  summary: 'LOT-2026-0101의 깨끗한 Ti-6Al-4V 블록을 C-01 조립 치구로 전환해 신규 소재 구매 없이 공정 치구를 제작합니다.',
  sections: {
    judgment_basis: '즉시 RED 게이트를 통과했고 상태 점수는 96.7 GREEN입니다. 성적서 기준 항복강도 828 MPa가 C-01 요구 600 MPa를 충족합니다.',
    required_docs: '원본 재질증명서 (LOT 성적서)\n치수 검사 성적서',
    machining_plan: '각 면에서 0.5 mm를 제거한 가용 형상을 기준으로 1회 셋업 가공합니다. 소재 식별 마킹을 보존하고 완료 후 주요 치수를 전수 검사합니다.',
    expected_effect: '신규 소재 대신 0.95 kg을 재사용해 180,000원의 순회수 가치를 얻고, 소재 활용률 64%를 달성합니다.',
  },
  metrics: { utilization: 0.64, reprocess_count: 1, saved_kg: 0.95, saved_krw: 180000 },
  created_at: '2026-10-20T05:40:02+00:00',
  updated_at: '2026-10-20T05:40:02+00:00',
};
