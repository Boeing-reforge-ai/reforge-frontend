import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import Icon from '@/components/Icon';
import MaterialDetail from '@/components/MaterialDetail';
import type { CameraFeed } from '@/hooks/useQrCamera';
import { LED_CLASS, SCRAP_RESULT, reasonLabel } from '@/lib/labels';
import { connectLed, sendLed, useLedStatus } from '@/lib/led';
import type { ScanView } from '@/lib/scan';
import type { ScanDetail } from '@/types/api';

const fmt = (v: number | null | undefined, unit = '') => (v == null ? '—' : `${v}${unit}`);

interface CameraProps {
  camera?: CameraFeed;
  videoRef?: React.Ref<HTMLVideoElement>;
}

function ScannerVisual({ view, scan, camera, videoRef }: { view: ScanView; scan: ScanDetail | null } & CameraProps) {
  const live = !scan && camera?.status === 'live';
  return (
    <div className="scanner-view">
      <div className="scanner-grid" />
      {!scan && camera && <video ref={videoRef} className="scanner-capture" muted playsInline />}
      {scan?.image_url ? (
        <img className="scanner-capture" src={`/api${scan.image_url}`} alt="스캔 캡처 이미지" />
      ) : scan ? (
        <div className="metal-piece">
          <div className="metal-hole one" /><div className="metal-hole two" />
          <div className="etched">{scan.lot.grade}<br />{scan.lot.lot_id}</div>
        </div>
      ) : (
        <div className="qr-guide"><span /><span /><span /><span /><Icon name="scan" className="size-8 text-slate-300" /></div>
      )}
      {view === 'analyzing' && <div className="scan-line" />}
      {view === 'done' && (
        <div className="scan-complete-popup">
          <span><Icon name="check" /></span>
          <div><strong>유형 및 상태 판정이 완료되었습니다.</strong></div>
        </div>
      )}
      <div className="camera-meta">
        {camera && !scan ? (
          <span>{live ? <><span className="live-dot" /> CAM 01 · LIVE</> : 'CAM 01 · NO SIGNAL'}</span>
        ) : (
          <span><span className="live-dot" /> CAM 01 · LIVE</span>
        )}
        <span>{live && camera.resolution ? camera.resolution.join(' × ') : '1920 × 1080'}</span>
      </div>
    </div>
  );
}

const CAPTION: Record<'idle' | 'failed', [string, string]> = {
  idle: ['자투리 QR을 스캔대에 올려주세요', '가이드 안에 QR 코드가 위치하도록 소재를 정렬하세요.'],
  failed: ['판정을 완료하지 못했습니다', '스캔 스테이션 연결과 QR 데이터를 확인해 주세요.'],
};

function DecisionCard({ scan }: { scan: ScanDetail }) {
  const navigate = useNavigate();
  const type = scan.scrap_type ?? '덩어리형';
  const tone = LED_CLASS[scan.led ?? 'G'];
  const screening = scan.screening ?? 'GREEN';
  // 빨강 덩어리형만 유형 아래에 사유 라벨을 표시
  const stacked = type === '덩어리형' && screening === 'RED';
  const label = stacked ? '재사용 불가' : screening === 'YELLOW' ? '추가 확인 필요' : SCRAP_RESULT[type].label;
  const note = scan.reason_codes.map(reasonLabel).join(', ');
  const density = fmt(scan.density_err == null ? null : +(scan.density_err * 100).toFixed(2), '%');

  return (
    <div className={`decision-card camera-decision ${tone}`}>
      <div className="decision-label">최종 유형 판정</div>
      <div className={`decision-title ${stacked ? 'stacked' : ''}`}>
        <span className="decision-dot" />
        <div className="decision-copy">
          <strong>{type}</strong>
          {!stacked && <i>·</i>}
          <b>{label}</b>
        </div>
      </div>
      {screening === 'GREEN' && (
        <>
          <div className="system-verdict">
            <div><span>상태 점수 (참고)</span><strong>{scan.condition_score}<small>/ 100</small></strong></div>
            <div><span>빨강·노랑 트리거</span><strong className="pass"><Icon name="check" /> 없음</strong></div>
            <div><span>밀도 교차검증</span><strong className="pass">{density} · 정상</strong></div>
          </div>
          <div className="decision-actions">
            {/* TODO: POST /scenarios/generate 호출 후 이동 */}
            <button className="primary-button" onClick={() => navigate(`/scans/${scan.scan_id}/scenarios`)}><Icon name="spark" /> AI 분석 시작 <Icon name="arrow" /></button>
            <button className="cancel-button" onClick={() => navigate('/')}>돌아가기</button>
          </div>
        </>
      )}
      {screening === 'YELLOW' && (
        <>
          <div className="yellow-actions">
            <span>추가 확인 {scan.yellow_actions.length}건 · 조치 후 다시 스캔</span>
            {scan.yellow_actions.map((a) => (
              <div key={a.action}><b>{a.action}</b><small>{a.items.join(', ')}</small></div>
            ))}
          </div>
          <div className="decision-actions">
            {/* TODO: POST /scenarios/generate 호출 후 이동 */}
            <button className="primary-button" onClick={() => navigate(`/scans/${scan.scan_id}/scenarios`)}><Icon name="spark" /> 확인 통과 시 후보 보기 <Icon name="arrow" /></button>
            <button className="cancel-button" onClick={() => navigate('/')}>돌아가기</button>
          </div>
        </>
      )}
      {screening === 'RED' && (
        <div className="reject-content">
          <p>{note}</p>
          <div className="bin-callout">
            <div><span>유형 분류</span><strong>{SCRAP_RESULT[type].bin}</strong></div>
            <button className="cancel-button bin-home" onClick={() => navigate('/')}><Icon name="return" className="size-4" /> 처음으로</button>
          </div>
        </div>
      )}
    </div>
  );
}

// 스테이션 LED 아두이노 연결 (Chrome·Edge Web Serial). 연결 안 됐을 때만 표시
// 한 번 허용한 포트는 restoreLed로 자동 재연결되므로 처음 연결·케이블 분리 시에만 보임
function LedButton() {
  const status = useLedStatus();
  if (status === 'connected' || status === 'unsupported') return null;
  return (
    <button className="led-button" disabled={status === 'connecting'} onClick={() => void connectLed()}>
      <span className="led-button-dot" /> {status === 'connecting' ? 'LED 연결 중…' : 'LED 연결'}
    </button>
  );
}

const PROGRESS_STEPS: [string, number][] = [['유형 판정', 0], ['소재 식별', 20], ['빨강·노랑 트리거', 50], ['밀도 검증', 65], ['상태 점수', 80]];

export default function ScanWorkspace({ scan, view, camera, videoRef, caption }: {
  scan: ScanDetail | null;
  view: ScanView;
  caption?: [string, string]; // idle 안내 문구 대체 (카메라 오류, QR 형식 오류)
} & CameraProps) {
  const navigate = useNavigate();
  const ledClass = view === 'done' && scan?.led ? LED_CLASS[scan.led] : '';

  // 판정이 끝나면 최종 LED 색 전송 (POST /scans 응답의 led는 판정 전 값이라 쓰지 않음)
  // 결과가 떠 있는 상태에서 나중에 LED를 연결해도 현재 색을 보내도록 연결 상태도 감시
  const finalLed = view === 'done' ? scan?.led : null;
  const ledStatus = useLedStatus();
  useEffect(() => {
    if (finalLed && ledStatus === 'connected') void sendLed(finalLed);
  }, [finalLed, ledStatus, scan?.scan_id]);

  return (
    <main className="analysis-main">
      <section className="scan-column">
        <div className="page-heading">
          <div><p>SCRAP IDENTIFICATION</p><h1>자투리 스캔 및 유형 판정</h1></div>
          <div className="station-tools">
            <LedButton />
            <span className="station-chip"><span className={`station-led ${ledClass}`} /> STATION 01</span>
          </div>
        </div>
        <ScannerVisual view={view} scan={scan} camera={camera} videoRef={videoRef} />
        {view === 'done' && scan ? (
          <DecisionCard key={scan.scan_id} scan={scan} />
        ) : view === 'idle' || view === 'failed' ? (
          <div className="scan-caption">
            <div className="caption-icon"><Icon name={view === 'idle' && !caption ? 'scan' : 'x'} /></div>
            <div><strong>{(caption ?? CAPTION[view])[0]}</strong><span>{(caption ?? CAPTION[view])[1]}</span></div>
          </div>
        ) : scan && (
          <div className="progress-card">
            <div className="progress-top"><span>유형 판정 중</span><strong>{scan.progress}<small>%</small></strong></div>
            <div className="progress-track"><span style={{ width: `${scan.progress}%` }} /></div>
            <div className="progress-steps">
              {PROGRESS_STEPS.map(([label, at]) => <span key={label} className={scan.progress > at ? 'on' : ''}>{label}</span>)}
            </div>
          </div>
        )}
      </section>
      <aside className="result-panel">
        <div className="panel-head"><span>분석 결과</span><span className="mono">{scan ? `SCAN #${String(scan.scan_id).padStart(4, '0')}` : ' '}</span></div>
        <div className="panel-body">
          {!scan ? (
            <div className="empty-result">
              <div className="empty-rings"><Icon name="box" className="size-9" /></div>
              <strong>스캔 대기 중</strong>
              <span>QR이 인식되면 로트 정보가<br />자동으로 표시됩니다.</span>
            </div>
          ) : view === 'failed' ? (
            <div className="error-card">
              <div className="error-icon"><Icon name="x" /></div>
              <h2>상태 판정에 실패했습니다.</h2>
              <p>{scan.error ?? '알 수 없는 오류가 발생했습니다.'}</p>
              <button className="secondary-button" onClick={() => navigate('/')}><Icon name="refresh" /> 다시 스캔</button>
            </div>
          ) : (
            <MaterialDetail scan={scan} />
          )}
        </div>
      </aside>
    </main>
  );
}

