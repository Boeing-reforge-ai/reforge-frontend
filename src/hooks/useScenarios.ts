import { useQuery } from '@tanstack/react-query';
import { getOrGenerateScenarios } from '@/api/scenarios';
import { getParts, getProductionPlans } from '@/api/reference';

export function useScenarios(scanId: number) {
  return useQuery({
    queryKey: ['scans', scanId, 'scenarios'],
    queryFn: () => getOrGenerateScenarios(scanId),
    enabled: Number.isInteger(scanId),
    staleTime: Infinity,
    retry: false, // 실패 시 재생성(LLM 호출)이 반복되지 않도록
  });
}

// 부품·생산계획은 기준 데이터라 한 번 받아서 계속 사용
export function useParts() {
  return useQuery({ queryKey: ['parts'], queryFn: getParts, staleTime: Infinity });
}

export function useProductionPlans() {
  return useQuery({ queryKey: ['production-plans'], queryFn: getProductionPlans, staleTime: Infinity });
}
