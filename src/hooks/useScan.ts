import { useMutation, useQuery } from '@tanstack/react-query';
import { createScan, getScan } from '@/api/scans';

const POLL_MS = 1000;

export const scanKey = (scanId: number) => ['scans', scanId] as const;

export function useCreateScan() {
  return useMutation({
    mutationFn: ({ qr, frame }: { qr: string; frame: Blob }) => createScan(qr, frame),
  });
}

// 판정이 끝날 때까지(status가 analyzing인 동안) 폴링
export function useScan(scanId: number) {
  return useQuery({
    queryKey: scanKey(scanId),
    queryFn: () => getScan(scanId),
    enabled: Number.isInteger(scanId),
    refetchInterval: (query) => (query.state.data?.status === 'analyzing' ? POLL_MS : false),
  });
}
