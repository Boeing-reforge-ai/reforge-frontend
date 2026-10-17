import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Icon from '@/components/Icon';
import MaterialDetail from '@/components/MaterialDetail';
import type { CameraFeed } from '@/hooks/useQrCamera';
import { CHIP_NOTE, LED_CLASS, SCRAP_RESULT, reasonLabel } from '@/lib/labels';
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
  const reusable = !!scan.reusable;
  const [countdown, setCountdown] = useState(5);
  // TODO: 칩형·오염형 자동 복귀 임시 해제 중. 복구 시 `!reusable`로 되돌리기
  const autoReturn = !reusable && type === '덩어리형';

  // 재사용 불가 자투리는 5초 뒤 스캔 대기 화면으로 복귀
  useEffect(() => {
    if (!autoReturn) return;
    const timer = window.setInterval(() => setCountdown((v) => v - 1), 1000);
    return () => window.clearInterval(timer);
  }, [autoReturn]);
  useEffect(() => {
    if (autoReturn && countdown <= 0) navigate('/');
  }, [countdown, autoReturn, navigate]);

  // 재사용 불가 덩어리형만 유형 아래에 사유 라벨을 표시
  const stacked = type === '덩어리형' && !reusable;
  const label = stacked ? (scan.screening === 'RED' ? '재사용 불가' : '추가 검토 대상') : SCRAP_RESULT[type].label;
  const note =
    type === '칩형' ? CHIP_NOTE[scan.lot.fam]
    : scan.reason_codes.length ? `${scan.reason_codes.map(reasonLabel).join(', ')}`
    : '';

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
      {reusable ? (
        <>
          <div className="system-verdict">
            <div><span>상태 점수</span><strong>{scan.condition_score}<small>/ 100</small></strong></div>
            <div><span>즉시 RED 게이트</span><strong className="pass"><Icon name="check" /> 통과</strong></div>
            <div><span>밀도 교차검증</span><strong className="pass">{fmt(scan.density_err == null ? null : +(scan.density_err * 100).toFixed(2), '%')} · 정상</strong></div>
          </div>
          {/* <p>
            {scan.needs_review ? '상태 점수가 경계 구간(75~85)이라 엔지니어 검토가 필요합니다. ' : ''}
            {scan.reason_codes.length ? `참고: ${scan.reason_codes.map(reasonLabel).join(', ')}. ` : '화학조성, 균열, 오염 항목이 모두 GREEN 구간입니다. '}
            재가공 소재로 사용할 수 있습니다.
          </p> */}
          <div className="decision-actions">
            {/* TODO: POST /scenarios/generate 호출 후 이동 */}
            <button className="primary-button" onClick={() => navigate(`/scans/${scan.scan_id}/scenarios`)}><Icon name="spark" /> AI 분석 시작 <Icon name="arrow" /></button>
            <button className="cancel-button" onClick={() => navigate('/')}>돌아가기</button>
          </div>
        </>
      ) : (
        <div className="reject-content">
          <p>{note}</p>
          <div className="bin-callout">
            <div><span>유형 분류</span><strong>{SCRAP_RESULT[type].bin}</strong></div>
            {autoReturn && <b>{countdown}초 후 자동 복귀</b>}
          </div>
        </div>
      )}
    </div>
  );
}

const PROGRESS_STEPS: [string, number][] = [['유형 판정', 0], ['소재 식별', 20], ['RED 게이트', 50], ['밀도 검증', 65], ['상태 점수', 80]];

export default function ScanWorkspace({ scan, view, camera, videoRef, caption }: {
  scan: ScanDetail | null;
  view: ScanView;
  caption?: [string, string]; // idle 안내 문구 대체 (카메라 오류, QR 형식 오류)
} & CameraProps) {
  const navigate = useNavigate();
  const ledClass = view === 'done' && scan?.led ? LED_CLASS[scan.led] : '';

  return (
    <main className="analysis-main">
      <section className="scan-column">
        <div className="page-heading">
          <div><p>SCRAP IDENTIFICATION</p><h1>자투리 스캔 및 유형 판정</h1></div>
          <span className="station-chip"><span className={`station-led ${ledClass}`} /> STATION 01</span>
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

