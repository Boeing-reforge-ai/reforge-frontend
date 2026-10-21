import { api } from '@/api/client';
import type { Proposal, ProposalSections } from '@/types/api';

export type ProposalPatch = Partial<Pick<Proposal, 'title' | 'summary'>> & { sections?: Partial<ProposalSections> };

// 호출할 때마다 새 제안서(새 proposal_id)가 생성됨
export async function generateProposal(scanId: number, scenarioId: number) {
  const { data } = await api.post<Proposal>('/proposals/generate', { scan_id: scanId, scenario_id: scenarioId });
  return data;
}

export async function getProposal(proposalId: number) {
  const { data } = await api.get<Proposal>(`/proposals/${proposalId}`);
  return data;
}

// 보낸 필드만 수정
export async function updateProposal(proposalId: number, patch: ProposalPatch) {
  const { data } = await api.patch<Proposal>(`/proposals/${proposalId}`, patch);
  return data;
}
