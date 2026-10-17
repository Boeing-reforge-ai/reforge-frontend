// 백엔드 API 응답 타입 (Notion API 명세서 기준)

export type Led = 'G' | 'Y' | 'R';
export type Shape = 'LUMP' | 'CONTAM';
export type ScrapType = '덩어리형' | '오염형';
export type Screening = 'GREEN' | 'YELLOW' | 'RED';
export type ScanStatus = 'analyzing' | 'done' | 'failed';
export type Usage = '목업' | 'EM' | '지그' | '보조도구';

export interface ScanCreated {
  scan_id: number;
  lot_id: string;
  status: ScanStatus;
  led: Led;
}

export interface LatestScan {
  scan_id: number | null;
  created_at: string | null;
}

export interface Lot {
  lot_id: string;
  fam: 'Ti' | 'Al';
  grade: string;
  temper: string | null;
  cert: boolean;
  ys: number | null;
  ys_src: string | null;
}

export interface Measure {
  dim_mm: [number, number, number] | null;
  kg: number | null;
  allow_mm: number | null;
  qty: number;
}

export interface Condition {
  chem: 'IN' | 'BORDER' | 'OUT' | null;
  crack: 'none' | 'suspected' | 'confirmed' | null;
  foreign: number | null;
  oil: number | null;
  dust: number | null;
  coat: number | null;
  oxide: number | null;
  corr: number | null;
  scratch: number | null;
  deform: number | null;
  flags: string[] | null;
}

export interface ItemScores {
  chem: number;
  foreign: number;
  surface: number;
  oil: number;
  coating: number;
  struct: number;
}

// 노랑(추가 확인) 조치. 같은 조치로 확인할 항목을 묶음
export interface YellowAction {
  action: string;
  items: string[];
}

export interface ScanDetail {
  scan_id: number;
  status: ScanStatus;
  progress: number;
  image_url: string | null;
  lot: Lot;
  measure: Measure;
  condition: Condition | null;
  scrap_type: ScrapType | null;
  led: Led | null;
  condition_score: number | null;
  screening: Screening | null;
  needs_review: boolean; // 폐지 (항상 false)
  item_scores: ItemScores | null;
  density_err: number | null;
  reason_codes: string[];
  yellow_actions: YellowAction[]; // 노랑일 때만 채워짐
  reusable: boolean | null;
  error: string | null;
  created_at: string;
}

export interface PartRef {
  part_id: string;
  name: string;
}

export interface Rejected extends PartRef {
  filter_type: 'shape' | 'qualification';
  reason: string;
}

export interface Breakdown {
  material: number;
  geometry: number;
  economics: number;
  demand: number;
  circularity: number;
}

export interface Scenario {
  scenario_id: number;
  rank: number;
  parts: PartRef[];
  usage: Usage;
  required_docs: string[];
  reason: string;
  breakdown: Breakdown;
  nrv: number;
  sell_price: number;
  score: number;
}

export interface ScenarioResult {
  candidates: PartRef[];
  rejected: Rejected[];
  scenarios: Scenario[];
  baseline: { name: string; score: number };
  recommended_id: number | null;
  conditional: boolean; // 노랑: 추가 확인 통과 시 후보
}

export interface Part {
  part_id: string;
  name: string;
  allowed_grades: string[];
  temper: string | null;
  reheat_allowed: boolean;
  min_dims_mm: [number, number, number];
  min_ys: number;
  cert_required: boolean;
  safety_critical: boolean;
  part_kg: number | null;
  moq: number;
  stage: number;
  sell_price: number | null;
  sell_price_src: string | null;
  cost: number;
}

export interface ProductionPlan {
  plan_id: number;
  part_id: string;
  part_name: string;
  quantity: number;
  due_date: string;
}

export interface ProposalSections {
  judgment_basis: string;
  required_docs: string;
  machining_plan: string;
  expected_effect: string;
}

export interface ProposalMetrics {
  utilization: number;
  reprocess_count: number;
  saved_kg: number;
  saved_krw: number;
}

export interface Proposal {
  proposal_id: number;
  scan_id: number;
  scenario_id: number;
  title: string;
  summary: string;
  sections: ProposalSections;
  metrics: ProposalMetrics;
  created_at: string;
  updated_at?: string;
}
