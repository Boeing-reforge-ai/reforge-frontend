// API 코드값 → 화면 표시용 한글

import type { Led, ScrapType, Screening } from '@/types/api';

export const CHEM_LABEL: Record<string, string> = { IN: '범위 내', BORDER: '경계', OUT: '이탈' };
export const CRACK_LABEL: Record<string, string> = { none: '미검출', suspected: '의심', confirmed: '확정' };
export const YS_SRC_LABEL: Record<string, string> = { A: '실측', B: '재질증명서', C: '공정기록', D: '대표값', E: '추정' };
export const USAGE_STAGE_LABEL: Record<number, string> = {
  1: '직접 재사용', 2: '최소 가공', 3: '다른 제품 소재', 4: '규격 블랭크', 5: '선별 스크랩', 6: '재용해',
};

const ITEM_LABEL: Record<string, string> = {
  foreign: '이종금속', oil: '오일', dust: '먼지', coat: '코팅', oxide: '산화', corr: '부식', scratch: '스크래치', deform: '변형',
};
const REASON_LABEL: Record<string, string> = {
  chem_border: '화학조성 경계', chem_out: '화학조성 이탈',
  crack_suspected: '균열 의심', crack_confirmed: '균열 확정',
  foreign_hard: '이종금속 분리 곤란', oil_hard: '오일 제거 곤란', deep_pit: '깊은 피팅',
  func_surface: '기능면 손상', coat_hard: '코팅 제거 곤란', straighten_hard: '변형 교정 곤란',
  density_mismatch: '밀도 불일치 (소재 의심)', contaminated: '오염형', tag_missing: '태그 분실 (로트 미확인)',
};

export function reasonLabel(code: string): string {
  if (REASON_LABEL[code]) return REASON_LABEL[code];
  const [item, kind] = code.split('_');
  if (ITEM_LABEL[item]) return `${ITEM_LABEL[item]} ${kind === 'over' ? '기준 초과' : '경계 (가드밴드)'}`;
  return code;
}

export const LED_CLASS: Record<Led, 'green' | 'yellow' | 'red'> = { G: 'green', Y: 'yellow', R: 'red' };

export const SCRAP_RESULT: Record<ScrapType, { label: string; bin: string }> = {
  덩어리형: { label: '재사용 가능', bin: '재사용 대기 함' },
  오염형: { label: '용해 처리 대상', bin: '용해용 함' },
};

// 3색 판정 표시명 (백엔드 COLOR_LABEL)
export const SCREENING_LABEL: Record<Screening, string> = {
  GREEN: '초록 · 재사용 (로트 유지)', YELLOW: '노랑 · 추가 확인 필요', RED: '빨강 · 용해',
};

export const won = (n: number) => `₩${n.toLocaleString()}`;
