import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { AiBadge } from '@/components/Brand';
import Icon from '@/components/Icon';
import MaterialDetail from '@/components/MaterialDetail';
import { getErrorMessage } from '@/api/client';
import { useScan } from '@/hooks/useScan';
import { useParts, useProductionPlans, useScenarios } from '@/hooks/useScenarios';
import { LED_CLASS, USAGE_STAGE_LABEL, won } from '@/lib/labels';
import type { Part, ProductionPlan, ScanDetail, Scenario, ScenarioResult } from '@/types/api';

const PILL_LABEL = { GREEN: '초록', YELLOW: '노랑 · 추가 확인', RED: '빨강' } as const;

// breakdown(축별 점수)에서 화면 지표 계산. 제안서 metrics와 같은 정의
const metricsOf = (s: Scenario) => ({
  utilization: Math.round((s.breakdown.geometry / 20) * 100),
  reprocess: 1,
  demand: Math.round((s.breakdown.demand / 15) * 100),
  saved: s.nrv,
});

function usableDims(s: ScanDetail) {
  const a = s.measure.allow_mm ?? 0;
  return (s.measure.dim_mm ?? [0, 0, 0]).map((d) => +(d - 2 * a).toFixed(1)).sort((x, y) => y - x);
}

function LotSummaryBar({ scan, detail, onToggle }: { scan: ScanDetail; detail: boolean; onToggle: () => void }) {
  const [w, d, h] = scan.measure.dim_mm ?? [0, 0, 0];
  return (
    <div className="lot-summary">
      <div><span>로트 번호</span><strong>{scan.lot.lot_id}</strong></div>
      <div><span>소재</span><span><strong>{scan.lot.grade}</strong><small>{scan.lot.temper}</small></span></div>
      <div><span>무게</span><strong>{scan.measure.kg}<small> kg</small></strong></div>
      <div><span>치수</span><strong>{w} × {d} × {h}<small> mm</small></strong></div>
      <div className={`reusable-pill ${LED_CLASS[scan.led ?? 'G']}`}>{scan.scrap_type} · {PILL_LABEL[scan.screening ?? 'GREEN']}</div>
      <button className={`lot-detail-toggle ${detail ? 'active' : ''}`} onClick={onToggle}>
        자세히 보기 <Icon name="chevron" className={`size-4 ${detail ? '-rotate-90' : 'rotate-90'}`} />
      </button>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="score-block">
      <div className="score-top"><span>우선순위 점수 P</span><strong>{score}<small>/ 100</small></strong></div>
      <div className="progress-track"><span style={{ width: `${score}%` }} /></div>
    </div>
  );
}

function ScenarioCard({ scan, result, scenario, part, demand, selected, onSelect }: {
  scan: ScanDetail; result: ScenarioResult; scenario: Scenario; part?: Part; demand: number; selected: boolean; onSelect: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const recommended = scenario.scenario_id === result.recommended_id;
  const m = metricsOf(scenario);
  const certOk = scan.lot.cert;
  const axes: [string, number, number][] = [
    ['소재 M', scenario.breakdown.material, 35], ['형상 G', scenario.breakdown.geometry, 20],
    ['경제성 E', scenario.breakdown.economics, 25], ['수요 D', scenario.breakdown.demand, 15], ['순환 R', scenario.breakdown.circularity, 5],
  ];

  return (
    <article className={`scenario-card ${selected ? 'selected' : ''} ${recommended ? 'recommended' : ''}`} onClick={onSelect}>
      {recommended && <div className="recommend-ribbon"><Icon name="spark" className="size-4" /> {result.conditional ? '확인 통과 시 추천' : '추천 시나리오'}</div>}
      <div className="scenario-select"><span className="radio">{selected && <span />}</span> 선택</div>
      <div className="scenario-main">
        <div className="scenario-copy">
          <div className="rank-label">RANK {String(scenario.rank).padStart(2, '0')}</div>
          <h2>{scenario.parts.map((p) => p.name).join(' + ')}</h2>
          <div className="tag-row">
            <span className="usage-tag">{scenario.usage}</span>
            {scenario.parts.map((p) => <span key={p.part_id} className="part-code">{p.part_id}</span>)}
          </div>
          <div className="cert-row">
            <span className="ok"><Icon name="check" /> 소재 등급 충족</span>
            <span className={certOk ? 'ok' : 'no'}><Icon name={certOk ? 'check' : 'x'} /> 재질증명서 승계 가능</span>
          </div>
        </div>
        <ScoreBar score={scenario.score} />
      </div>
      <div className="metric-grid">
        <div><span>재료 활용률</span><strong>{m.utilization}<small>%</small></strong></div>
        <div><span>가공 횟수</span><strong>{m.reprocess}<small>회</small></strong></div>
        <div><span>수요 충족도</span><strong>{m.demand}<small>%</small></strong></div>
        <div><span>순회수 가치</span><strong><small>₩</small>{m.saved.toLocaleString()}</strong></div>
      </div>
      <div className="scenario-bottom">
        <div className="docs"><span><AiBadge /> 필요 서류</span><div>{scenario.required_docs.map((doc) => <b key={doc}>{doc}</b>)}</div></div>
        <div className="reason">
          <div><AiBadge /> 판정 근거</div>
          <p className={expanded ? '' : 'line-clamp-1'}>{scenario.reason}</p>
          <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? '접기' : '상세 보기'} <Icon name="chevron" className={`size-4 ${expanded ? '-rotate-90' : 'rotate-90'}`} />
          </button>
        </div>
      </div>
      {expanded && part && (
        <div className="scenario-expanded" onClick={(e) => e.stopPropagation()}>
          <div className="expanded-head">
            <div><span>SCORING DETAILS</span><strong>우선순위 점수 산정 내역</strong></div>
            <b>총점 {scenario.score} / 100</b>
          </div>
          <div className="axis-list">
            {axes.map(([label, value, max]) => (
              <div className="axis-item" key={label}>
                <div><span>{label}</span><strong>{value}<small> / {max}</small></strong></div>
                <i><b style={{ width: `${(value / max) * 100}%` }} /></i>
              </div>
            ))}
          </div>
          <div className="expanded-facts">
            <div><span>최소 요구 치수</span><strong>{part.min_dims_mm.join(' × ')} mm</strong><small>가용 {usableDims(scan).join(' × ')} mm</small></div>
            <div><span>최소 항복강도</span><strong>{part.min_ys} MPa</strong><small>{scan.lot.ys ? `실제 ${scan.lot.ys} MPa · 통과` : '대표값 사용'}</small></div>
            <div><span>예상 경제성</span><strong>{won(scenario.sell_price)}</strong><small>비용 {won(scenario.sell_price - scenario.nrv)}</small></div>
            <div><span>수요 / 재사용 수준</span><strong>생산계획 {demand}개</strong><small>{part.stage} · {USAGE_STAGE_LABEL[part.stage]}</small></div>
          </div>
          <div className="qualification-flow">
            {['소재 계열 일치', '가용 치수 충족', '요구 강도 충족'].map((item) => <span key={item}><Icon name="check" /> {item}</span>)}
            <span className={certOk ? '' : 'warn'}><Icon name={certOk ? 'check' : 'file'} /> {certOk ? '성적서 승계 가능' : '추가 성적서 필요'}</span>
          </div>
        </div>
      )}
    </article>
  );
}

function Comparison({ list, selectedId }: { list: Scenario[]; selectedId: number }) {
  const rows: [string, (s: Scenario) => number, (v: number) => string, 'max' | 'min'][] = [
    ['우선순위 점수 P', (s) => s.score, (v) => `${v}점`, 'max'],
    ['재료 활용률', (s) => metricsOf(s).utilization, (v) => `${v}%`, 'max'],
    ['가공 횟수', (s) => metricsOf(s).reprocess, (v) => `${v}회`, 'min'],
    ['수요 충족도', (s) => metricsOf(s).demand, (v) => `${v}%`, 'max'],
    ['순회수 가치', (s) => s.nrv, won, 'max'],
  ];
  return (
    <section className="content-section comparison-section">
      <div className="section-title"><div><p>COMPARISON</p><h2>시나리오 비교</h2></div></div>
      <div className="comparison-table">
        <div className="comparison-row head">
          <span>비교 지표</span>
          {list.map((s) => <b className={s.scenario_id === selectedId ? 'active-col' : ''} key={s.scenario_id}>{s.parts[0].name}{s.parts.length > 1 ? ` 외 ${s.parts.length - 1}` : ''}</b>)}
        </div>
        {rows.map(([label, get, format, mode]) => {
          const values = list.map(get);
          const best = mode === 'max' ? Math.max(...values) : Math.min(...values);
          return (
            <div className="comparison-row" key={label}>
              <span>{label}</span>
              {values.map((v, i) => <b className={v === best ? 'best' : ''} key={list[i].scenario_id}>{format(v)}</b>)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// 시나리오 화면: 스캔 결과 + 시나리오(없으면 생성) + 부품·생산계획 기준 데이터
export default function ScenarioPage() {
  const navigate = useNavigate();
  const scanId = Number(useParams().scanId);
  const scan = useScan(scanId);
  const scenarios = useScenarios(scanId);
  const parts = useParts();
  const plans = useProductionPlans();

  const error = scan.error ?? scenarios.error;
  if (error) {
    return (
      <main className="scenario-page">
        <div className="error-card">
          <div className="error-icon"><Icon name="x" /></div>
          <h2>시나리오를 불러오지 못했습니다.</h2>
          <p>{getErrorMessage(error)}</p>
          <button className="secondary-button" onClick={() => navigate('/')}><Icon name="refresh" /> 다시 스캔</button>
        </div>
      </main>
    );
  }
  if (!scan.data || !scenarios.data) {
    return (
      <main className="scenario-page">
        <div className="empty-result">
          <div className="empty-rings"><Icon name="spark" className="size-9" /></div>
          <strong>재활용 시나리오를 분석하고 있습니다</strong>
          <span>처음 분석할 때는 AI가 시나리오를 생성하므로<br />시간이 조금 걸릴 수 있습니다.</span>
        </div>
      </main>
    );
  }
  return <ScenarioContent scan={scan.data} result={scenarios.data} parts={parts.data ?? []} plans={plans.data ?? []} />;
}

function ScenarioContent({ scan, result, parts, plans }: { scan: ScanDetail; result: ScenarioResult; parts: Part[]; plans: ProductionPlan[] }) {
  const navigate = useNavigate();
  const partsById = Object.fromEntries(parts.map((p) => [p.part_id, p])) as Record<string, Part>;
  const demandById = plans.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.part_id]: (acc[p.part_id] ?? 0) + p.quantity }), {});
  const [selected, setSelected] = useState(result.recommended_id ?? result.scenarios[0].scenario_id);
  const [showRejected, setShowRejected] = useState(false);
  const [compare, setCompare] = useState(false);
  const [detail, setDetail] = useState(false);
  const scenario = result.scenarios.find((s) => s.scenario_id === selected)!;

  return (
    <>
      <LotSummaryBar scan={scan} detail={detail} onToggle={() => setDetail(!detail)} />
      {/* 자세히 보기: 바 아래로 펼쳐지며 본문을 밀어냄 */}
      {detail && (
        <div className="lot-detail-panel">
          <MaterialDetail scan={scan} withJudgment hideSummary />
        </div>
      )}
      <main className="scenario-page">
        <div className="page-intro">
          <div><p>AI SCENARIO ANALYSIS</p><h1>재활용 시나리오 분석</h1><span>형상 적합성과 생산 계획을 종합하여 최적의 재활용 경로를 추천합니다.</span></div>
          <button className={`compare-button ${compare ? 'active' : ''}`} onClick={() => setCompare(!compare)}><Icon name="compare" /> 비교 보기 <i>{compare ? 'ON' : 'OFF'}</i></button>
        </div>
        <section className="content-section">
          <div className="section-title"><div><p>GEOMETRY · QUALIFICATION FILTER</p><h2>후보 필터 결과</h2></div><b>{result.candidates.length}개 통과</b></div>
          <div className="filter-grid">
            {result.candidates.map((c) => {
              const p = partsById[c.part_id];
              return (
                <article className="filter-card" key={c.part_id}>
                  <div className="pass-icon"><Icon name="check" /></div>
                  <div><span>{c.part_id}</span><strong>{c.name}</strong><p>{p?.min_dims_mm.join(' × ')} mm <i /> {p?.part_kg != null ? `${p.part_kg} kg` : '가용 치수 그대로'}</p></div>
                </article>
              );
            })}
          </div>
          {result.rejected.length > 0 && (
            <>
              <button className="rejected-toggle" onClick={() => setShowRejected(!showRejected)}>
                <Icon name="chevron" className={`size-4 ${showRejected ? 'rotate-90' : ''}`} /> 탈락 부품 {result.rejected.length}개 보기
              </button>
              {showRejected && result.rejected.map((r) => (
                <div className="rejected-row" key={r.part_id}>
                  <Icon name="x" /><span>{r.part_id}</span><strong>{r.name}</strong><p>{r.filter_type === 'shape' ? '형상 필터' : '자격 필터'}</p><b>{r.reason}</b>
                </div>
              ))}
            </>
          )}
        </section>
        <section className="content-section recommendation-section">
          <div className="section-title"><div><p>RECOMMENDATION</p><h2>시나리오 추천 순위</h2></div><b>총 {result.scenarios.length}개 시나리오</b></div>
          {/* 노랑: 추가 확인을 통과해야 후보로 확정 */}
          {result.conditional && (
            <div className="conditional-note">
              <strong><Icon name="file" className="size-4" /> 추가 확인 {scan.yellow_actions.length}건을 통과해야 확정되는 후보입니다</strong>
              <ul>{scan.yellow_actions.map((a) => <li key={a.action}><b>{a.action}</b> {a.items.join(', ')}</li>)}</ul>
            </div>
          )}
          <div className="scenario-list">
            {result.scenarios.map((s) => <ScenarioCard key={s.scenario_id} scan={scan} result={result} scenario={s} part={partsById[s.parts[0].part_id]} demand={demandById[s.parts[0].part_id] ?? 0} selected={selected === s.scenario_id} onSelect={() => setSelected(s.scenario_id)} />)}
          </div>
          <article className="baseline-card">
            <div><span>BASELINE</span><strong>{result.baseline.name}</strong><p>재활용 없이 신규 {scan.lot.grade} 소재 구매</p></div>
            <div className="baseline-metrics">{['활용률 0%', '가공 0회', '수요 충족 0%', '순회수 ₩0'].map((t) => <span key={t}>{t}</span>)}</div>
          </article>
        </section>
        {compare && <Comparison list={result.scenarios} selectedId={selected} />}
      </main>
      <div className="selection-bar">
        <div><span>선택한 시나리오</span><strong>{scenario.parts.map((p) => p.name).join(' + ')}</strong><i>우선순위 점수 P {scenario.score}점{result.conditional ? ' · 확인 통과 시' : ''}</i></div>
        <div className="selection-actions">
          <button className="cancel-button dark" onClick={() => navigate('/')}><Icon name="x" /></button>
          {/* TODO: POST /proposals/generate { scan_id, scenario_id } 후 /proposals/{proposal_id}로 이동 */}
          <button className="primary-button" onClick={() => navigate('/proposals/1')}><Icon name="file" /> 이 시나리오로 제안서 생성 <Icon name="arrow" /></button>
        </div>
      </div>
    </>
  );
}
