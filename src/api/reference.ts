import { api } from '@/api/client';
import type { Part, ProductionPlan } from '@/types/api';

export async function getParts() {
  const { data } = await api.get<Part[]>('/parts');
  return data;
}

export async function getProductionPlans() {
  // weeks 기본값(3주)이면 4주차 계획이 빠져 점수 계산(전체 합계)과 수요 수치가 어긋남
  const { data } = await api.get<ProductionPlan[]>('/production-plans', { params: { weeks: 52 } });
  return data;
}
