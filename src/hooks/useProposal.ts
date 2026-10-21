import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { generateProposal, getProposal, updateProposal, type ProposalPatch } from '@/api/proposals';
import type { Proposal } from '@/types/api';

const proposalKey = (proposalId: number) => ['proposals', proposalId] as const;

export function useProposal(proposalId: number) {
  return useQuery({
    queryKey: proposalKey(proposalId),
    queryFn: () => getProposal(proposalId),
    enabled: Number.isInteger(proposalId),
  });
}

// 생성 응답을 캐시에 넣어 제안서 화면에서 다시 조회하지 않음
export function useGenerateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scanId, scenarioId }: { scanId: number; scenarioId: number }) => generateProposal(scanId, scenarioId),
    onSuccess: (p) => queryClient.setQueryData<Proposal>(proposalKey(p.proposal_id), p),
  });
}

export function useUpdateProposal(proposalId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProposalPatch) => updateProposal(proposalId, patch),
    onSuccess: (p) => queryClient.setQueryData<Proposal>(proposalKey(proposalId), p),
  });
}
