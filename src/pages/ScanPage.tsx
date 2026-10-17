import { useState } from 'react';
import { useNavigate } from 'react-router';
import ScanWorkspace from '@/components/scan/ScanWorkspace';
import { useQrCamera, type CameraStatus } from '@/hooks/useQrCamera';
import { mockScanFromQr } from '@/mocks/qr';

const CAMERA_CAPTION: Partial<Record<CameraStatus, [string, string]>> = {
  denied: ['카메라 권한이 필요합니다', '브라우저 주소창에서 카메라 접근을 허용한 뒤 새로고침하세요.'],
  unavailable: ['카메라를 찾을 수 없습니다', '웹캠 연결을 확인하세요. (localhost 또는 HTTPS에서만 동작)'],
};

// 메인(스캔 대기) 화면: 웹캠으로 QR 인식 → 분석 화면으로 이동
export default function ScanPage() {
  const navigate = useNavigate();
  const [qrError, setQrError] = useState<string | null>(null);

  // TODO: POST /scans (qr + frame, X-Station-Key) 응답의 scan_id로 이동
  const { videoRef, camera } = useQrCamera((text) => {
    try {
      const scan = mockScanFromQr(text);
      navigate(`/scans/${scan.scan_id}/analysis`, { state: { scan } });
    } catch (e) {
      setQrError((e as Error).message);
    }
  });

  const caption = CAMERA_CAPTION[camera.status]
    ?? (qrError ? [qrError, '스캔 대상 자투리의 QR 라벨을 확인해 주세요.'] as [string, string] : undefined);

  return <ScanWorkspace scan={null} view="idle" camera={camera} videoRef={videoRef} caption={caption} />;
}
