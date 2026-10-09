import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import Icon from '@/components/Icon';
import { CHEM_LABEL, CHIP_NOTE, CRACK_LABEL, LED_CLASS, SCRAP_RESULT, YS_SRC_LABEL, reasonLabel } from '@/lib/labels';
import type { ScanView } from '@/lib/scan';
import type { ScanDetail } from '@/types/api';

const fmtDim = (d: [number, number, number] | null) => (d ? `${d[0]} × ${d[1]} × ${d[2]} mm` : '—');
const fmt = (v: number | null | undefined, unit = '') => (v == null ? '—' : `${v}${unit}`);

function ScannerVisual({ view, scan }: { view: ScanView; scan: ScanDetail | null }) {
  return (
    <div className="scanner-view">
      <div className="scanner-grid" />
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
          <div><strong>유형 및 상태 판정이 완료되었습니다</strong><small>캡처 이미지를 고정했습니다</small></div>
        </div>
      )}
      <div className="camera-meta">
        <span><span className="live-dot" /> CAM 01 · LIVE</span>
        <span>1920 × 1080</span>
      </div>
    </div>
  );
}

const CAPTION: Record<Exclude<ScanView, 'done'>, [string, string]> = {
  idle: ['자투리 QR을 스캔대에 올려주세요', '가이드 안에 QR 코드가 위치하도록 소재를 정렬하세요.'],
  recognized: ['QR 인식 완료', '로트 정보를 불러왔습니다. 유형 판정을 시작합니다.'],
  analyzing: ['판정 엔진이 소재를 분석하고 있습니다', '유형 · RED 게이트 · 밀도 검증 · 상태 점수를 순차 분석합니다.'],
  failed: ['판정을 완료하지 못했습니다', '스캔 스테이션 연결과 QR 데이터를 확인해 주세요.'],
};

function DecisionCard({ scan }: { scan: ScanDetail }) {
  const navigate = useNavigate();
  const type = scan.scrap_type ?? '덩어리형';
  const tone = LED_CLASS[scan.led ?? 'G'];
  const reusable = !!scan.reusable;
  const [countdown, setCountdown] = useState(5);

  // 재사용 불가 자투리는 5초 뒤 스캔 대기 화면으로 복귀
  useEffect(() => {
    if (reusable) return;
    const timer = window.setInterval(() => setCountdown((v) => v - 1), 1000);
    return () => window.clearInterval(timer);
  }, [reusable]);
  useEffect(() => {
    if (!reusable && countdown <= 0) navigate('/');
  }, [countdown, reusable, navigate]);

  const label = type === '덩어리형' && !reusable ? (scan.screening === 'RED' ? '재사용 불가' : '추가 검토 대상') : SCRAP_RESULT[type].label;
  const note =
    type === '칩형' ? CHIP_NOTE[scan.lot.fam]
    : scan.reason_codes.length ? `판정 사유: ${scan.reason_codes.map(reasonLabel).join(', ')}`
    : '';

  return (
    <div className={`decision-card camera-decision ${tone}`}>
      <div className="decision-label">최종 유형 판정</div>
      <div className={`decision-title ${reusable ? '' : 'stacked'}`}>
        <span className="decision-dot" />
        <div className="decision-copy">
          <strong>{type}</strong>
          {reusable && <i>·</i>}
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
          <p>
            {scan.needs_review ? '상태 점수가 경계 구간(75~85)이라 엔지니어 검토가 필요합니다. ' : ''}
            {scan.reason_codes.length ? `참고: ${scan.reason_codes.map(reasonLabel).join(', ')}. ` : '화학조성, 균열, 오염 항목이 모두 GREEN 구간입니다. '}
            재가공 소재로 사용할 수 있습니다.
          </p>
          <div className="decision-actions">
            {/* TODO: POST /scenarios/generate 호출 후 이동 */}
            <button className="primary-button" onClick={() => navigate(`/scans/${scan.scan_id}/scenarios`)}><Icon name="spark" /> AI 분석 시작 <Icon name="arrow" /></button>
            <button className="cancel-button" onClick={() => navigate('/')}><Icon name="x" /> 취소</button>
          </div>
        </>
      ) : (
        <div className="reject-content">
          <p>{note}</p>
          <div className="bin-callout">
            <div><span>유형 분류</span><strong>{SCRAP_RESULT[type].bin}</strong></div>
            <b>{countdown}초 후 자동 복귀</b>
          </div>
        </div>
      )}
    </div>
  );
}

function LotDetails({ scan }: { scan: ScanDetail }) {
  const { lot, measure, condition: c } = scan;
  const rows: [string, string][] = [
    ['로트 번호', lot.lot_id],
    ['소재', lot.grade],
    ['소재 계열 / 질별', `${lot.fam} / ${lot.temper ?? '—'}`],
    ['실제 항복강도', fmt(lot.ys, ' MPa')],
    ['강도값 출처', lot.ys_src ? `${lot.ys_src} · ${YS_SRC_LABEL[lot.ys_src]}` : '—'],
    ['무게', fmt(measure.kg, ' kg')],
    ['치수', fmtDim(measure.dim_mm)],
    ['보유 수량', `${measure.qty}개`],
  ];
  const tone = scan.screening === 'GREEN' ? '' : scan.screening === 'YELLOW' ? 'yellow' : 'red';
  const inspection: [string, string, string][] = [
    ['화학조성', c?.chem ? CHEM_LABEL[c.chem] : '—', c?.chem ?? '—'],
    ['균열', c?.crack ? CRACK_LABEL[c.crack] : '—', 'NDT'],
    ['표면 제거 여유', fmt(measure.allow_mm, ' mm'), 'ALLOW'],
    ['밀도 오차', scan.density_err == null ? '—' : `${(scan.density_err * 100).toFixed(2)}%`, 'PASS < 5%'],
    ['즉시 RED 게이트', scan.screening === 'RED' && scan.condition_score == null ? '해당' : scan.screening ? '통과' : '—', 'GATE'],
    ['성적서', lot.cert ? '보유' : '미보유', 'CERT'],
  ];
  const surface: [string, number | null | undefined, string][] = [
    ['오일', c?.oil, 'wt.%'], ['이종금속', c?.foreign, 'wt.%'], ['먼지', c?.dust, 'wt.%'], ['산화', c?.oxide, '%'],
    ['코팅', c?.coat, '%'], ['부식', c?.corr, '%'], ['스크래치', c?.scratch, '%'], ['변형률', c?.deform, '%'],
  ];

  return (
    <div className="space-y-5">
      <section>
        <div className="section-kicker">LOT INFORMATION</div>
        <div className="info-table">
          {rows.map(([key, value]) => <div className="info-row" key={key}><span>{key}</span><strong>{value}</strong></div>)}
        </div>
      </section>
      {c && (
        <section>
          <div className="section-kicker inspection-heading">
            <span>QUALITY & TRACEABILITY</span>
            {scan.screening && (
              <b className={tone}><Icon name="check" className="size-3" /> {scan.condition_score != null ? `상태 점수 ${scan.condition_score} ` : ''}{scan.screening}{scan.needs_review ? ' · 검토 필요' : ''}</b>
            )}
          </div>
          <div className="inspection-grid">
            {inspection.map(([label, value, code]) => (
              <div className="inspection-item" key={label}><span>{label}</span><strong>{value}</strong><i>{code}</i></div>
            ))}
          </div>
          <div className="surface-matrix">
            <div className="surface-title"><span>표면 · 오염 검사</span><b>NDT</b></div>
            <div className="surface-values">
              {surface.map(([label, value, unit]) => (
                <div key={label}><span>{label}</span><strong>{value ?? '—'}<small>{unit}</small></strong></div>
              ))}
            </div>
          </div>
        </section>
      )}
      <div className="grid grid-cols-2 gap-3">
        <article className="mini-card">
          <div className="mini-title"><Icon name="file" className="size-4" /> 재질증명서</div>
          <b>{lot.cert ? '보유' : '미보유'}</b><span>{lot.lot_id}</span><span>{lot.ys_src ? `강도 출처 ${YS_SRC_LABEL[lot.ys_src]}` : '강도값 없음 (대표값 사용)'}</span>
        </article>
        <article className="mini-card">
          <div className="mini-title"><Icon name="scan" className="size-4" /> 스캔 기록</div>
          <b>SCAN #{String(scan.scan_id).padStart(4, '0')}</b><span>STATION 01</span><span>{new Date(scan.created_at).toLocaleString('ko-KR')}</span>
        </article>
      </div>
    </div>
  );
}

const PROGRESS_STEPS: [string, number][] = [['유형 판정', 0], ['소재 식별', 20], ['RED 게이트', 50], ['밀도 검증', 65], ['상태 점수', 80]];

export default function ScanWorkspace({ scan, view }: { scan: ScanDetail | null; view: ScanView }) {
  const navigate = useNavigate();
  const ledClass = view === 'done' && scan?.led ? LED_CLASS[scan.led] : '';
  const [title, desc] = view === 'done' ? ['', ''] : CAPTION[view];

  return (
    <main className="analysis-main">
      <section className="scan-column">
        <div className="page-heading">
          <div><p>SCRAP IDENTIFICATION</p><h1>자투리 스캔 및 유형 판정</h1></div>
          <span className="station-chip"><span className={`station-led ${ledClass}`} /> STATION 01</span>
        </div>
        <ScannerVisual view={view} scan={scan} />
        {view === 'done' && scan ? (
          <DecisionCard key={scan.scan_id} scan={scan} />
        ) : (
          <div className="scan-caption">
            <div className="caption-icon"><Icon name={view === 'idle' ? 'scan' : view === 'failed' ? 'x' : 'check'} /></div>
            <div><strong>{title}</strong><span>{desc}</span></div>
          </div>
        )}
      </section>
      <aside className="result-panel">
        <div className="panel-head"><span>분석 결과</span><span className="mono">{scan ? `SCAN #${String(scan.scan_id).padStart(4, '0')}` : '—'}</span></div>
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
              <h2>상태 판정에 실패했습니다</h2>
              <p>{scan.error ?? '알 수 없는 오류가 발생했습니다.'}</p>
              <button className="secondary-button" onClick={() => navigate('/')}><Icon name="refresh" /> 다시 스캔</button>
            </div>
          ) : (
            <>
              <LotDetails scan={scan} />
              {view !== 'done' && (
                <div className="progress-card">
                  <div className="progress-top"><span>유형 판정 중</span><strong>{scan.progress}<small>%</small></strong></div>
                  <div className="progress-track"><span style={{ width: `${scan.progress}%` }} /></div>
                  <div className="progress-steps">
                    {PROGRESS_STEPS.map(([label, at]) => <span key={label} className={scan.progress > at ? 'on' : ''}>{label}</span>)}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </main>
  );
}

