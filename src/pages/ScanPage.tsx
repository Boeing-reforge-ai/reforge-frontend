import { useState } from 'react';
import { useNavigate } from 'react-router';
import ScanWorkspace from '@/components/scan/ScanWorkspace';
import { useQrCamera, type CameraStatus } from '@/hooks/useQrCamera';
import { useCreateScan } from '@/hooks/useScan';
import { getErrorMessage } from '@/api/client';
import { useLang } from '@/i18n/useLang';
import type { Bi } from '@/i18n/pair';

const CAMERA_CAPTION: Partial<Record<CameraStatus, [Bi, Bi]>> = {
  denied: [['Camera permission required', '카메라 권한이 필요합니다'], ['Allow camera access in the browser address bar, then reload.', '브라우저 주소창에서 카메라 접근을 허용한 뒤 새로고침하세요.']],
  unavailable: [['Camera not found', '카메라를 찾을 수 없습니다'], ['Check the webcam connection. (Works only on localhost or HTTPS)', '웹캠 연결을 확인하세요. (localhost 또는 HTTPS에서만 동작)']],
};

// 메인(스캔 대기) 화면: 웹캠으로 QR 인식 → POST /scans → 분석 화면으로 이동
export default function ScanPage() {
  const navigate = useNavigate();
  const { tr } = useLang();
  const [qrError, setQrError] = useState<string | null>(null);
  const createScan = useCreateScan();

  const { videoRef, camera } = useQrCamera((qr, frame) => {
    if (createScan.isPending) return; // 등록 중에 같은 QR이 다시 잡혀도 한 번만 보냄
    if (!frame) return setQrError(tr('Failed to capture the camera frame.', '카메라 화면을 캡처하지 못했습니다.'));
    setQrError(null);
    createScan.mutate({ qr, frame }, {
      onSuccess: ({ scan_id }) => navigate(`/scans/${scan_id}/analysis`),
      onError: (e) => setQrError(getErrorMessage(e)),
    });
  });

  const cam = CAMERA_CAPTION[camera.status];
  const caption: [string, string] | undefined = cam ? [tr(...cam[0]), tr(...cam[1])]
    : createScan.isPending ? [tr('QR code recognized', 'QR을 인식했습니다'), tr('Registering the scan…', '스캔을 등록하고 있습니다…')]
    : qrError ? [qrError, tr('Check the QR label on the scrap piece being scanned.', '스캔 대상 자투리의 QR 라벨을 확인해 주세요.')]
    : undefined;

  return <ScanWorkspace scan={null} view="idle" camera={camera} videoRef={videoRef} caption={caption} />;
}
