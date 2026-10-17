// 백엔드 app/core/criteria.py 판정 기준 미러 (화면 표시용). 값 바뀌면 같이 수정

// [GREEN 상한 G, YELLOW 상한 Y]
export const THRESHOLDS: Record<string, [number, number]> = {
  oxide: [5, 20], scratch: [2, 5], deform: [2, 5], oil: [0.2, 1.0],
  dust: [0.05, 0.25], foreign: [0.05, 0.2], coat: [5, 30], corr: [5, 20],
};

// 가드밴드 w: G - w 이하만 초록, G - w < x ≤ Y 는 노랑
export const GUARD: Record<string, number> = {
  foreign: 0.01, oil: 0.05, dust: 0.01, coat: 1.0, oxide: 1.0, corr: 1.0, scratch: 0.5, deform: 1.0,
};

export const DENSITY_TOL = 0.05;

// 기준 밀도 g/cm³ (app/seed.py Material.rho_ref)
export const RHO_REF: Record<string, number> = { 'Ti-6Al-4V': 4.43, 'Ti-Grade2': 4.51, 'Al-7075': 2.81, 'Al-6061': 2.70 };

// 태그 분실 시 백엔드가 만드는 임시 로트 번호 접두어
export const NO_TAG_PREFIX = 'NO-TAG-';
