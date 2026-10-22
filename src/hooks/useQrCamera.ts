import { useEffect, useRef, useState } from 'react';
import { BarcodeDetector, prepareZXingModule } from 'barcode-detector/ponyfill';
import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';

// 기본값은 jsDelivr CDN에서 wasm을 받아옴 → 스테이션 네트워크 상황에 안 휘둘리게 번들에 포함
prepareZXingModule({
  overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? zxingWasmUrl : prefix + path) },
});

export type CameraStatus = 'starting' | 'live' | 'denied' | 'unavailable';

export interface CameraFeed {
  status: CameraStatus;
  resolution: [number, number] | null;
}

const SCAN_INTERVAL_MS = 300;
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
    // ZXing이라 반전(어두운 바탕의 밝은 QR)도 같이 잡힘, 원본 해상도 그대로 디코딩
    const detector = new BarcodeDetector({ formats: ['qr_code'] });

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
      if (video && video.readyState >= video.HAVE_ENOUGH_DATA) {
        const t = performance.now();
        const text = (await detector.detect(video).catch(() => []))[0]?.rawValue;
        // TODO 임시: 디코딩 소요시간 측정용, SCAN_INTERVAL_MS 정하고 나면 지우기
        console.log(`detect ${Math.round(performance.now() - t)}ms @ ${video.videoWidth}x${video.videoHeight}`, text ?? '');
        if (cancelled) return;
        const now = Date.now();
        if (text && !(text === last.text && now - last.at < REPEAT_COOLDOWN_MS)) {
          last = { text, at: now };
          const frame = await captureFrame(video);
          if (cancelled) return;
          onDetectRef.current(text, frame);
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
