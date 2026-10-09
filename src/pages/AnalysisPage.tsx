import { useState } from 'react';
import ScanWorkspace from '@/components/scan/ScanWorkspace';
import { viewOf } from '@/lib/scan';
import { mockAnalyzingScan, mockChipScan, mockContamScan, mockScan } from '@/mocks/data';
import type { ScanDetail } from '@/types/api';

const DEMO: [string, ScanDetail][] = [
  ['판정 중', mockAnalyzingScan],
  ['덩어리', mockScan],
  ['칩', mockChipScan],
  ['오염', mockContamScan],
  ['실패', { ...mockAnalyzingScan, status: 'failed', error: 'QR 데이터의 소재 정보를 확인할 수 없습니다.' }],
];

// 분석 진행 화면
// TODO: GET /scans/{scanId}를 status가 analyzing인 동안 폴링 (TanStack Query refetchInterval)
export default function AnalysisPage() {
  const [scan, setScan] = useState<ScanDetail>(mockScan);
  return (
    <>
      <ScanWorkspace scan={scan} view={viewOf(scan)} />
      {import.meta.env.DEV && (
        <div className="demo-controls">
          <span>DEMO</span>
          {DEMO.map(([label, s]) => <button key={label} onClick={() => setScan(s)}>{label}</button>)}
        </div>
      )}
    </>
  );
}
