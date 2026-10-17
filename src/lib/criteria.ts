// 백엔드 app/core/criteria.py 판정 기준 미러 (제안서 측정 항목 표 표시용). 값 바뀌면 같이 수정

// [GREEN 상한, YELLOW 상한]
export const THRESHOLDS: Record<string, [number, number]> = {
  oxide: [5, 20], scratch: [2, 5], deform: [2, 5], oil: [0.2, 1.0],
  dust: [0.05, 0.25], foreign: [0.05, 0.2], coat: [5, 30], corr: [5, 20],
};

export const DENSITY_TOL = 0.05;

// 기준 밀도 g/cm³ (app/seed.py Material.rho_ref)
export const RHO_REF: Record<string, number> = { 'Ti-6Al-4V': 4.43, 'Ti-Grade2': 4.51, 'Al-7075': 2.81, 'Al-6061': 2.70 };

// 상태 점수 C 구간
export const SCORE_GREEN = 85;
export const SCORE_REVIEW = 75;
export const SCORE_YELLOW = 40;
