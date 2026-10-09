import ScanWorkspace from '@/components/scan/ScanWorkspace';

// 메인(스캔 대기) 화면
// TODO: GET /scans/latest 폴링 → 진입 시점과 scan_id가 달라지면 /scans/{id}/analysis로 이동
export default function ScanPage() {
  return <ScanWorkspace scan={null} view="idle" />;
}
