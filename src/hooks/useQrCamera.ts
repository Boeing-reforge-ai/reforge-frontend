import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export type CameraStatus = 'starting' | 'live' | 'denied' | 'unavailable';

export interface CameraFeed {
  status: CameraStatus;
  resolution: [number, number] | null;
}

const SCAN_WIDTH = 720; // 디코딩용 축소 폭 (전체 해상도로 돌리면 프레임이 밀림)
const SCAN_INTERVAL_MS = 150;
const REPEAT_COOLDOWN_MS = 3000; // 같은 QR이 계속 비치는 동안 중복 콜백 방지

// 웹캠 영상을 띄우고 QR이 인식되면 onDetect(QR 문자열, 그 순간 프레임) 호출
// 스테이션을 별도 장치로 분리하게 되면 이 훅만 걷어내면 된다
export function useQrCamera(onDetect: (text: string, frame: Blob | null) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  // HTTPS나 localhost가 아니면 mediaDevices 자체가 없음
  const [status, setStatus] = useState<CameraStatus>(() => (typeof navigator.mediaDevices?.getUserMedia === 'function' ? 'starting' : 'unavailable'));
  const [resolution, setResolution] = useState<[number, number] | null>(null);
  const onDetectRef = useRef(onDetect);
  useEffect(() => {
    onDetectRef.current = onDetect;
  });

  useEffect(() => {
    if (typeof navigator.mediaDevices?.getUserMedia !== 'function') return;
    let stream: MediaStream | null = null;
    let timer = 0;
    let cancelled = false;
    let last = { text: '', at: 0 };
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const captureFrame = (video: HTMLVideoElement) =>
      new Promise<Blob | null>((resolve) => {
        const full = document.createElement('canvas');
        full.width = video.videoWidth;
        full.height = video.videoHeight;
        full.getContext('2d')?.drawImage(video, 0, 0);
        full.toBlob(resolve, 'image/jpeg', 0.9);
      });

    const tick = async () => {
      const video = videoRef.current;
      if (video && ctx && video.readyState >= video.HAVE_ENOUGH_DATA) {
        canvas.width = SCAN_WIDTH;
        canvas.height = Math.round((video.videoHeight / video.videoWidth) * SCAN_WIDTH);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(data, width, height, { inversionAttempts: 'dontInvert' });
        const now = Date.now();
        if (code?.data && !(code.data === last.text && now - last.at < REPEAT_COOLDOWN_MS)) {
          last = { text: code.data, at: now };
          const frame = await captureFrame(video);
          if (cancelled) return;
          onDetectRef.current(code.data, frame);
        }
      }
      if (!cancelled) timer = window.setTimeout(tick, SCAN_INTERVAL_MS);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          video.onloadedmetadata = () => setResolution([video.videoWidth, video.videoHeight]);
          void video.play();
        }
        setStatus('live');
        tick();
      })
      .catch((e: DOMException) => {
        if (!cancelled) setStatus(e.name === 'NotAllowedError' ? 'denied' : 'unavailable');
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, camera: { status, resolution } satisfies CameraFeed };
}
