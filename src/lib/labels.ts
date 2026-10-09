// API 코드값 → 화면 표시용 한글

import type { Led, ScrapType } from '@/types/api';

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
  density_mismatch: '밀도 불일치 (소재 의심)', contaminated: '오염형',
};

export function reasonLabel(code: string): string {
  if (REASON_LABEL[code]) return REASON_LABEL[code];
  const [item, kind] = code.split('_');
  if (ITEM_LABEL[item]) return `${ITEM_LABEL[item]} ${kind === 'over' ? '기준 초과' : '주의'}`;
  return code;
}

export const LED_CLASS: Record<Led, 'green' | 'yellow' | 'red'> = { G: 'green', Y: 'yellow', R: 'red' };

export const SCRAP_RESULT: Record<ScrapType, { label: string; bin: string }> = {
  덩어리형: { label: '재사용 가능', bin: '재사용 대기 함' },
  칩형: { label: '칩 회수 대상', bin: '칩 회수 함' },
  오염형: { label: '용해 처리 대상', bin: '용해용 함' },
};

export const CHIP_NOTE: Record<string, string> = {
  Ti: 'Ti 칩은 화재 위험이 있어 밀폐 철제 드럼에 보관합니다.',
  Al: 'Al 칩은 압축 후 합금별로 분리 보관합니다.',
};

export const won = (n: number) => `₩${n.toLocaleString()}`;
