// API 코드값 → 화면 표시용 문구. 값은 [영어, 한국어] 쌍이고 tr(...쌍)으로 꺼낸다.
import type { Bi } from '@/i18n/pair';
import type { Led, ScrapType, Screening } from '@/types/api';

export const CHEM_LABEL: Record<string, Bi> = { IN: ['In range', '범위 내'], BORDER: ['Borderline', '경계'], OUT: ['Out of range', '이탈'] };
export const CRACK_LABEL: Record<string, Bi> = { none: ['Not detected', '미검출'], suspected: ['Suspected', '의심'], confirmed: ['Confirmed', '확정'] };
export const YS_SRC_LABEL: Record<string, Bi> = {
  A: ['measured', '실측'], B: ['mill certificate', '재질증명서'], C: ['process record', '공정기록'], D: ['typical value', '대표값'], E: ['estimated', '추정'],
};
export const USAGE_STAGE_LABEL: Record<number, Bi> = {
  1: ['Direct reuse', '직접 재사용'], 2: ['Minimal machining', '최소 가공'], 3: ['Material for other products', '다른 제품 소재'],
  4: ['Standard blank', '규격 블랭크'], 5: ['Sorted scrap', '선별 스크랩'], 6: ['Remelting', '재용해'],
};

const ITEM_LABEL: Record<string, Bi> = {
  foreign: ['Foreign metal', '이종금속'], oil: ['Oil', '오일'], dust: ['Dust', '먼지'], coat: ['Coating', '코팅'],
  oxide: ['Oxidation', '산화'], corr: ['Corrosion', '부식'], scratch: ['Scratch', '스크래치'], deform: ['Deformation', '변형'],
};
const REASON_LABEL: Record<string, Bi> = {
  chem_border: ['Composition borderline', '화학조성 경계'], chem_out: ['Composition out of range', '화학조성 이탈'],
  crack_suspected: ['Crack suspected', '균열 의심'], crack_confirmed: ['Crack confirmed', '균열 확정'],
  foreign_hard: ['Foreign metal hard to separate', '이종금속 분리 곤란'], oil_hard: ['Oil hard to remove', '오일 제거 곤란'], deep_pit: ['Deep pitting', '깊은 피팅'],
  func_surface: ['Functional surface damaged', '기능면 손상'], coat_hard: ['Coating hard to remove', '코팅 제거 곤란'], straighten_hard: ['Deformation hard to straighten', '변형 교정 곤란'],
  density_mismatch: ['Density mismatch (suspect material)', '밀도 불일치 (소재 의심)'], contaminated: ['Contaminated', '오염형'], tag_missing: ['Tag missing (lot unverified)', '태그 분실 (로트 미확인)'],
};

export function reasonLabel(code: string, tr: (en: string, ko: string) => string): string {
  if (REASON_LABEL[code]) return tr(...REASON_LABEL[code]);
  const [item, kind] = code.split('_');
  if (ITEM_LABEL[item]) {
    const name = tr(...ITEM_LABEL[item]);
    return kind === 'over' ? tr(`${name} over limit`, `${name} 기준 초과`) : tr(`${name} borderline (guard band)`, `${name} 경계 (가드밴드)`);
  }
  return code;
}

export const LED_CLASS: Record<Led, 'green' | 'yellow' | 'red'> = { G: 'green', Y: 'yellow', R: 'red' };

// scrap_type 값(덩어리형·오염형)은 API 코드값이라 그대로 두고 표시만 번역한다
export const SCRAP_TYPE_LABEL: Record<ScrapType, Bi> = { 덩어리형: ['Bulk', '덩어리형'], 오염형: ['Contaminated', '오염형'] };
export const SCRAP_RESULT: Record<ScrapType, { label: Bi; bin: Bi }> = {
  덩어리형: { label: ['Reusable', '재사용 가능'], bin: ['Reuse standby bin', '재사용 대기 함'] },
  오염형: { label: ['Send to remelting', '용해 처리 대상'], bin: ['Remelting bin', '용해용 함'] },
};

// 3색 판정 표시명 (백엔드 COLOR_LABEL)
export const SCREENING_LABEL: Record<Screening, Bi> = {
  GREEN: ['Green · Reuse (lot retained)', '초록 · 재사용 (로트 유지)'], YELLOW: ['Yellow · Further check needed', '노랑 · 추가 확인 필요'], RED: ['Red · Remelt', '빨강 · 용해'],
};

export const won = (n: number) => `₩${n.toLocaleString()}`;
