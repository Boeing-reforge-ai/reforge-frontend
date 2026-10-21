import { AxiosError } from 'axios';
import { api } from '@/api/client';
import type { ScenarioResult } from '@/types/api';

// 이미 생성된 시나리오가 있으면 그대로 쓰고, 없을 때(404)만 생성
// 생성은 LLM을 호출하고 기존 시나리오·제안서를 지우므로 매번 하지 않는다
export async function getOrGenerateScenarios(scanId: number) {
  try {
    const { data } = await api.get<ScenarioResult>(`/scans/${scanId}/scenarios`);
    return data;
  } catch (e) {
    if (!(e instanceof AxiosError && e.response?.status === 404)) throw e;
  }
  const { data } = await api.post<ScenarioResult>('/scenarios/generate', { scan_id: scanId });
  return data;
}
