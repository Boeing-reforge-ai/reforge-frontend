import { api } from '@/api/client';
import type { Part, ProductionPlan } from '@/types/api';

export async function getParts() {
  const { data } = await api.get<Part[]>('/parts');
  return data;
}

export async function getProductionPlans() {
  const { data } = await api.get<ProductionPlan[]>('/production-plans');
  return data;
}
