import { useState } from 'react';
import { useNavigate } from 'react-router';
import ScanWorkspace from '@/components/scan/ScanWorkspace';
import { useQrCamera, type CameraStatus } from '@/hooks/useQrCamera';
import { useCreateScan } from '@/hooks/useScan';
import { getErrorMessage } from '@/api/client';

const CAMERA_CAPTION: Partial<Record<CameraStatus, [string, string]>> = {
  denied: ['카메라 권한이 필요합니다', '브라우저 주소창에서 카메라 접근을 허용한 뒤 새로고침하세요.'],
  unavailable: ['카메라를 찾을 수 없습니다', '웹캠 연결을 확인하세요. (localhost 또는 HTTPS에서만 동작)'],
};

// 메인(스캔 대기) 화면: 웹캠으로 QR 인식 → POST /scans → 분석 화면으로 이동
export default function ScanPage() {
  const navigate = useNavigate();
  const [qrError, setQrError] = useState<string | null>(null);
  const createScan = useCreateScan();

  const { videoRef, camera } = useQrCamera((qr, frame) => {
    if (createScan.isPending) return; // 등록 중에 같은 QR이 다시 잡혀도 한 번만 보냄
    if (!frame) return setQrError('카메라 화면을 캡처하지 못했습니다.');
    setQrError(null);
    createScan.mutate({ qr, frame }, {
      onSuccess: ({ scan_id }) => navigate(`/scans/${scan_id}/analysis`),
      onError: (e) => setQrError(getErrorMessage(e)),
    });
  });

  const caption = CAMERA_CAPTION[camera.status]
    ?? (createScan.isPending ? ['QR을 인식했습니다', '스캔을 등록하고 있습니다…'] as [string, string] : undefined)
    ?? (qrError ? [qrError, '스캔 대상 자투리의 QR 라벨을 확인해 주세요.'] as [string, string] : undefined);

  return <ScanWorkspace scan={null} view="idle" camera={camera} videoRef={videoRef} caption={caption} />;
}
