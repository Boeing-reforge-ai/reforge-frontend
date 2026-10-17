import { useRef, useState, type ReactNode } from 'react';
import { useReactToPrint } from 'react-to-print';
import Icon from '@/components/Icon';
import { DENSITY_TOL, THRESHOLDS } from '@/lib/criteria';
import { CHEM_LABEL, CRACK_LABEL, USAGE_STAGE_LABEL, YS_SRC_LABEL } from '@/lib/labels';
import { mockParts, mockProposal, mockScan, mockScenarios } from '@/mocks/data';
import type { Proposal, Screening } from '@/types/api';

type EditKey = 'summary' | 'judgment_basis' | 'required_docs' | 'machining_plan' | 'expected_effect';

// 양식 고정 문구 (조직 정보)
const ORG = {
  to: '품질보증팀장',
  cc: '생산기술팀, 치공구 제작반',
  from: 'Reforge AI 스캔 스테이션 (중앙 집하장)',
  security: '사내 한정',
  retention: '원 로트 품질기록과 동일',
  reviewer: '생산기술팀',
  approver: '품질보증팀',
};
const DECISION_DAYS = 7; // 결정 요청 기한 = 작성일 + 7일

const VERDICT: Record<Screening, { short: string; long: string; tone: string }> = {
  GREEN: { short: '초록 · 로트 유지', long: '초록 (재사용 가능, 로트 추적 유지)', tone: 'green' },
  YELLOW: { short: '노랑 · 추가 확인', long: '노랑 (추가 확인 필요)', tone: 'yellow' },
  RED: { short: '빨강 · 용해 대상', long: '빨강 (재사용 불가, 용해 처리)', tone: 'red' },
};

const MEASURES: [key: string, label: string, unit: string][] = [
  ['oxide', '산화 면적', '%'], ['scratch', '스크래치 깊이 / 두께', '%'], ['deform', '변형률', '%'],
  ['oil', '오일 잔류', 'wt.%'], ['dust', '먼지 · 입자', 'wt.%'], ['foreign', '이종금속 혼입', 'wt.%'],
  ['coat', '코팅 면적', '%'], ['corr', '부식 면적', '%'],
];

const krw = (n: number) => `${n.toLocaleString()} 원`;
const fmtDate = (d: Date) => d.toLocaleDateString('ko-KR');

// num: 오른쪽 정렬할 숫자 열 인덱스
function Table({ head, rows, num = [] }: { head: string[]; rows: ReactNode[][]; num?: number[] }) {
  return (
    <table className="doc-table">
      <thead><tr>{head.map((h, j) => <th key={h} className={num.includes(j) ? 'num' : undefined}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={num.includes(j) ? 'num' : undefined}>{c}</td>)}</tr>)}</tbody>
    </table>
  );
}

// 항목-내용 2열 표 (머리줄 없음)
function KeyValue({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <table className="doc-kv">
      <tbody>{rows.map(([k, v]) => <tr key={k}><th>{k}</th><td>{v}</td></tr>)}</tbody>
    </table>
  );
}

const RESULT_TONE: Record<string, string> = { 적합: 'ok', 주의: 'warn', 부적합: 'bad', '확인 필요': 'warn' };
const Result = ({ value }: { value: string }) => <span className={`doc-result ${RESULT_TONE[value] ?? ''}`}>{value}</span>;

function Section({ title, edit, children }: { title: string; edit?: { on: boolean; toggle: () => void }; children: ReactNode }) {
  return (
    <section className="doc-sec">
      <h2>
        {title}
        {edit && <button className="doc-edit" onClick={edit.toggle}><Icon name={edit.on ? 'check' : 'edit'} /> {edit.on ? '완료' : '편집'}</button>}
      </h2>
      {children}
    </section>
  );
}

function Text({ value, editing, onChange }: { value: string; editing: boolean; onChange: (v: string) => void }) {
  return editing
    ? <textarea className="doc-textarea" value={value} onChange={(e) => onChange(e.target.value)} autoFocus />
    : <p className="doc-text">{value}</p>;
}

function ProposalSkeleton() {
  return (
    <div className="skeleton-doc">
      <div className="skeleton-line wide" /><div className="skeleton-line title" />
      <div className="skeleton-metrics">{[1, 2, 3, 4].map((n) => <span key={n} />)}</div>
      {[1, 2, 3, 4, 5, 6].map((n) => <div className="skeleton-section" key={n}><i /><b /><b /></div>)}
    </div>
  );
}

// TODO: GET /proposals/{proposalId}, GET /scans/{scanId}, 시나리오·부품 조회로 교체. 편집 완료 시 PATCH /proposals/{proposalId}
export default function ProposalPage() {
  const scan = mockScan;
  const [proposal, setProposal] = useState<Proposal | null>(mockProposal);
  const [editing, setEditing] = useState<EditKey | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: paperRef, documentTitle: proposal?.title ?? 'Reforge AI 제안서' });

  const update = (key: EditKey, value: string) => {
    if (!proposal) return;
    setProposal(key === 'summary'
      ? { ...proposal, summary: value }
      : { ...proposal, sections: { ...proposal.sections, [key]: value } });
  };
  const edit = (key: EditKey) => ({ on: editing === key, toggle: () => setEditing(editing === key ? null : key) });
  const text = (key: EditKey) => (
    <Text
      value={key === 'summary' ? proposal!.summary : proposal!.sections[key]}
      editing={editing === key} onChange={(v) => update(key, v)}
    />
  );

  const doc = proposal && (() => {
    const { lot, measure, condition: c } = scan;
    const scenarios = [...mockScenarios.scenarios].sort((a, b) => a.rank - b.rank);
    const scenario = scenarios.find((s) => s.scenario_id === proposal.scenario_id) ?? scenarios[0];
    const parts = scenario.parts.map((p) => mockParts.find((mp) => mp.part_id === p.part_id)).filter((p) => p != null);
    const main = parts[0];
    const target = scenario.parts.map((p) => `${p.part_id} ${p.name}`).join(', ');
    const created = new Date(proposal.created_at);
    const due = new Date(created.getTime() + DECISION_DAYS * 86400000);
    const revised = proposal.updated_at && proposal.updated_at !== proposal.created_at ? new Date(proposal.updated_at) : null;
    const verdict = scan.screening ? VERDICT[scan.screening] : null;
    const m = proposal.metrics;
    const util = Math.round(m.utilization * 100);
    const dims = measure.dim_mm ? measure.dim_mm.join(' × ') : null;
    return { lot, measure, c, scenarios, scenario, parts, main, target, created, due, revised, verdict, m, util, dims,
      docNo: `RF-PRP-${lot.lot_id.replace(/^LOT-/, '')}-${String(proposal.proposal_id).padStart(2, '0')}` };
  })();

  return (
    <main className="proposal-page">
      <div className="proposal-top">
        <div><p>RECYCLING PROPOSAL</p><h1>재활용 제안서</h1><span>AI가 생성한 내용을 검토하고 필요한 항목을 직접 편집할 수 있습니다.</span></div>
      </div>
      <div className="proposal-workspace">
        <div className="paper official" ref={paperRef}>
          {!proposal || !doc ? <ProposalSkeleton /> : (
            <>
              <div className="doc-running">REFORGE AI · 자투리 재사용 처분 제안서 &nbsp;|&nbsp; {doc.docNo} &nbsp;Rev.0</div>

              <table className="doc-meta">
                <tbody>
                  <tr><th>문서번호</th><td>{doc.docNo}</td><th>개정</th><td>Rev.0 ({doc.revised ? `최종 수정 ${fmtDate(doc.revised)}` : '최초 작성'})</td></tr>
                  <tr><th>작성일</th><td>{fmtDate(doc.created)}</td><th>보존 기한</th><td>{ORG.retention}</td></tr>
                  <tr><th>수신</th><td>{ORG.to}</td><th>참조</th><td>{ORG.cc}</td></tr>
                  <tr><th>발신</th><td>{ORG.from}</td><th>보안 등급</th><td>{ORG.security}</td></tr>
                </tbody>
              </table>

              <div className="doc-subject">
                <h1>{proposal.title}</h1>
              </div>

              <div className="doc-hero">
                <div className="from">
                  <span>현재 (재사용 대상)</span>
                  <strong>{doc.lot.grade} 잔재</strong>
                  <small>{doc.lot.lot_id}<br />{doc.dims ? `${doc.dims} mm · ` : ''}{doc.measure.kg} kg</small>
                </div>
                <div className="arrow"><b>재사용 ▶</b><small>용해 없이</small></div>
                <div className="to">
                  <span>재활용처 (제안)</span>
                  <strong>{doc.target}</strong>
                  <small>{targetDesc(doc.scenario.usage, doc.main?.stage, doc.m.reprocess_count)}</small>
                </div>
              </div>
              <div className="doc-kpis">
                <div><span>판정</span><strong className={doc.verdict?.tone}>{doc.verdict?.short ?? '—'}</strong></div>
                <div><span>순회수 가치</span><strong>{krw(doc.m.saved_krw)}</strong></div>
                <div><span>소재 활용률</span><strong>{doc.util} %</strong></div>
                <div><span>결정 요청 기한</span><strong>{fmtDate(doc.due)}</strong></div>
              </div>

              <Section title="1. 목적" edit={edit('summary')}>{text('summary')}</Section>

              <Section title="2. 요청 사항 및 결정 요구">
                <KeyValue rows={[
                  ['처분 요청', `재사용 (용도 변경: 원자재 잔재 → ${doc.scenario.usage} ${doc.target})`],
                  ['적용 범위', doc.parts.some((p) => p.safety_critical)
                    ? '안전 중요 부품. 성적서(실측·재질증명서) 강도값 필수'
                    : `비행 안전 부품 아님. ${doc.scenario.usage} 용도에 한정`],
                  ['결정 요구 기한', fmtDate(doc.due)],
                  ['승인 시 후속 조치', '식별 각인 확정 → 생산기술팀 가공 지시 발행'],
                ]} />
              </Section>

              <Section title="3. 대상 잔재 식별 및 추적성">
                <KeyValue rows={[
                  ['원 로트 번호', doc.lot.lot_id],
                  ['소재 · 질별', `${doc.lot.grade}${doc.lot.temper ? `, ${doc.lot.temper}` : ''}`],
                  ['재질증명서', doc.lot.cert ? '보유 (원본 대조 필요 · 붙임 1)' : '미보유'],
                  ['잔재 치수 · 질량', `${doc.dims ? `${doc.dims} mm · ` : ''}${doc.measure.kg} kg`],
                  ['추적 계보', `원자재 ${doc.lot.lot_id} → 잔재 → ${doc.target} (식별 표시에 원 로트 번호 이관)`],
                ]} />
              </Section>

              <Section title="4. 판정 결과" edit={edit('judgment_basis')}>
                <h3>가. 종합 판정: {doc.verdict?.long ?? '—'}{scan.condition_score != null && ` · 상태 점수 ${scan.condition_score}`}</h3>
                <div className="doc-indent">{text('judgment_basis')}</div>
                <h3>나. 측정 항목별 결과</h3>
                <Table head={['항목', '측정값', '초록 기준', '결과']} num={[1, 2]} rows={[
                  ...MEASURES.map(([key, label, unit]) => {
                    const v = doc.c?.[key as keyof typeof doc.c] as number | null | undefined;
                    const [g, y] = THRESHOLDS[key];
                    return [label, v == null ? '—' : `${v} ${unit}`, `${g} ${unit} 이하`, v == null ? '—' : <Result value={v <= g ? '적합' : v <= y ? '주의' : '부적합'} />];
                  }),
                  ['밀도 대조', scan.density_err == null ? '—' : `오차 ${(scan.density_err * 100).toFixed(2)} %`, `${doc.lot.grade} 기준 ± ${DENSITY_TOL * 100} %`,
                    scan.density_err == null ? '—' : <Result value={scan.density_err <= DENSITY_TOL ? '적합' : '주의'} />],
                  ['균열 · 화학조성', `균열 ${doc.c?.crack ? CRACK_LABEL[doc.c.crack] : '—'} · 화학조성 ${doc.c?.chem ? CHEM_LABEL[doc.c.chem] : '—'}`, '—',
                    <Result value={doc.c?.crack === 'none' && doc.c?.chem === 'IN' ? '적합' : '확인 필요'} />],
                ]} />
                <h3>다. 재질 근거</h3>
                <p className="doc-text doc-indent">
                  {doc.lot.ys != null && doc.main
                    ? `${doc.lot.ys_src ? YS_SRC_LABEL[doc.lot.ys_src] : ''} 기준 항복강도 ${doc.lot.ys} MPa로, ${doc.main.part_id} 요구 항복강도 ${doc.main.min_ys} MPa를 ${doc.lot.ys >= doc.main.min_ys ? '충족합니다' : '충족하지 못합니다'} (강도비 ${(doc.lot.ys / doc.main.min_ys).toFixed(2)}).`
                    : '로트 항복강도 값이 없어 소재 대표값 기준으로 평가했습니다.'}
                  {' '}내부 결함·화학조성은 원자재 입고 시 검사 기록을 승계합니다.
                </p>
              </Section>

              <Section title="5. 재사용 방안 및 대안 비교">
                <Table head={['후보', '활용 단계', '우선순위 점수', '순회수 가치', '용도']} num={[2, 3]} rows={doc.scenarios.map((s) => {
                  const stage = mockParts.find((p) => p.part_id === s.parts[0]?.part_id)?.stage;
                  const name = s.parts.map((p) => `${p.part_id} ${p.name}`).join(', ');
                  const chosen = s.scenario_id === doc.scenario.scenario_id;
                  return [chosen ? <b>{name} (제안)</b> : name, stage ? USAGE_STAGE_LABEL[stage] : '—', `${s.score} (${s.rank}위)`, krw(s.nrv), s.usage];
                })} />
              </Section>

              <Section title="6. 가공 및 검사 계획" edit={edit('machining_plan')}>{text('machining_plan')}</Section>

              <Section title="7. 기대 효과" edit={edit('expected_effect')}>
                <KeyValue rows={[
                  ['순회수 가치', `${krw(doc.m.saved_krw)} (대체 가치 ${krw(doc.scenario.sell_price)} − 가공·검사·물류비 ${krw(doc.scenario.sell_price - doc.m.saved_krw)})`],
                  ['소재 활용률', `${doc.util} % (부품 ${doc.m.saved_kg} kg ÷ 잔재 ${doc.measure.kg} kg)`],
                  ['신규 원자재', `${doc.target} 제작용 ${doc.lot.grade} ${doc.m.saved_kg} kg 신규 구매 회피`],
                  ['가공 횟수', `${doc.m.reprocess_count}회`],
                ]} />
                <div className="doc-gap">{text('expected_effect')}</div>
              </Section>

              <Section title="8. 위험 요소 및 제한 사항">
                <ol className="doc-list ga">
                  <li>본 처분은 {doc.target} ({doc.scenario.usage}) 용도에 한정하며, 다른 용도 전환 시 재승인이 필요합니다.</li>
                  <li>순회수 가치는 사내 기준 단가 기반 추정치이며, 실제 원가는 생산기술팀 견적으로 확정합니다.</li>
                  <li>측정 기준값은 시스템 초기값으로, 정기 반복 측정을 통해 보정 중입니다.</li>
                  {scan.needs_review && <li>상태 점수가 경계 구간이므로 엔지니어 추가 검토 후 승인해야 합니다.</li>}
                </ol>
              </Section>

              <Section title="9. 붙임" edit={edit('required_docs')}>
                {editing === 'required_docs' ? text('required_docs') : (
                  <ol className="doc-list">
                    {proposal.sections.required_docs.split('\n').filter(Boolean).map((d) => <li key={d}>{d}</li>)}
                    <li>스캔 스테이션 측정 기록 (사진, 치수, 무게, 판정 로그)</li>
                    <li>우선순위 산정 내역 (5개 축 점수)</li>
                  </ol>
                )}
                <div className="doc-end">끝.</div>
              </Section>

              <table className="doc-sign">
                <thead><tr><th>구분</th><th>작성</th><th>검토</th><th>승인</th></tr></thead>
                <tbody>
                  <tr><th>소속</th><td>Reforge AI (자동 생성)</td><td>{ORG.reviewer}</td><td>{ORG.approver}</td></tr>
                  <tr><th>성명</th><td>—</td><td /><td /></tr>
                  <tr className="tall"><th>서명 · 일자</th><td>{fmtDate(doc.created)}</td><td /><td /></tr>
                  <tr><th>결정</th><td colSpan={3}>□ 승인 &nbsp; □ 조건부 승인 &nbsp; □ 반려 &nbsp; □ 보류</td></tr>
                </tbody>
              </table>
              <p className="doc-history"><b>개정 이력</b> Rev.0 · {fmtDate(doc.created)} · 최초 작성 (Reforge AI 자동 생성){doc.revised && ` · ${fmtDate(doc.revised)} 내용 수정`}</p>
              <p className="doc-ai"><b>AI 생성 고지</b> 본문 문장은 시스템 계산값을 바탕으로 AI가 작성했으며, 수치·판정의 최종 책임은 결재권자에게 있습니다.</p>
              <div className="doc-foot">본 문서는 Reforge AI가 생성한 초안이며, 승인권자의 검토·서명 후 효력이 발생한다.</div>
            </>
          )}
        </div>
        <div className="action-stack">
          <div className="proposal-state"><Icon name="edit" className="size-4" /> 편집 가능</div>
          <aside className="floating-actions">
            <span>문서 작업</span>
            <button onClick={() => print()}><Icon name="download" /> PDF 저장</button>
            <button onClick={() => print()}><Icon name="print" /> 인쇄</button>
            {/* TODO: POST /proposals/generate 다시 호출 */}
            <button onClick={() => setProposal(mockProposal)}><Icon name="refresh" /> 다시 생성</button>
            <div><Icon name="check" /><p><strong>검토 준비 완료</strong>9개 항목 작성됨</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function targetDesc(usage: string, stage: number | undefined, count: number) {
  return [usage, stage ? USAGE_STAGE_LABEL[stage] : null, `${count}회 가공`].filter(Boolean).join(' · ');
}
