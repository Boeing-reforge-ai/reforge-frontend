import { useState } from 'react';
import { useParams } from 'react-router';
import ScanWorkspace from '@/components/scan/ScanWorkspace';
import { getErrorMessage } from '@/api/client';
import { useScan } from '@/hooks/useScan';
import { useLang } from '@/i18n/useLang';
import { viewOf } from '@/lib/scan';
import { mockAnalyzingScan, mockContamScan, mockScan, mockYellowScan } from '@/mocks/data';
import type { ScanDetail } from '@/types/api';

const DEMO: [string, ScanDetail][] = [
  ['Analyzing', mockAnalyzingScan],
  ['Green', mockScan],
  ['Yellow', mockYellowScan],
  ['Red', mockContamScan],
  ['Failed', { ...mockAnalyzingScan, status: 'failed', error: 'Cannot verify the material information in the QR data.' }],
];

// 분석 진행 화면: GET /scans/{scanId}를 판정이 끝날 때까지 폴링
export default function AnalysisPage() {
  const { scanId } = useParams();
  const { tr } = useLang();
  const { data, error } = useScan(Number(scanId));
  const [demo, setDemo] = useState<ScanDetail | null>(null); // 개발 모드 DEMO 버튼으로 덮어쓴 상태
  const scan = demo ?? data ?? null;

  const caption: [string, string] | undefined = scan ? undefined
    : error ? [getErrorMessage(error), tr('Go back to the scan screen and scan again.', '스캔 화면으로 돌아가 다시 스캔해 주세요.')]
    : [tr('Loading scan information', '스캔 정보를 불러오는 중입니다'), tr('Please wait a moment.', '잠시만 기다려 주세요.')];

  return (
    <>
      <ScanWorkspace scan={scan} view={viewOf(scan)} caption={caption} />
      {import.meta.env.DEV && (
        <div className="demo-controls">
          <span>DEMO</span>
          {DEMO.map(([label, s]) => <button key={label} onClick={() => setDemo(s)}>{label}</button>)}
        </div>
      )}
    </>
  );
}
