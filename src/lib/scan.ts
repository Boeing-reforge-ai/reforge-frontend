import type { ScanDetail } from '@/types/api';

export type ScanView = 'idle' | 'recognized' | 'analyzing' | 'done' | 'failed';

// 스캔 응답 → 분석 화면 상태
export function viewOf(scan: ScanDetail | null): ScanView {
  if (!scan) return 'idle';
  if (scan.status === 'failed') return 'failed';
  if (scan.status === 'done') return 'done';
  return scan.progress === 0 ? 'recognized' : 'analyzing';
}
