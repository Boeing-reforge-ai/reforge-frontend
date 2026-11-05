import { useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useReactToPrint } from 'react-to-print';
import { getErrorMessage } from '@/api/client';
import Icon from '@/components/Icon';
import { useLang } from '@/i18n/useLang';
import type { Bi } from '@/i18n/pair';
import { useGenerateProposal, useProposal, useUpdateProposal } from '@/hooks/useProposal';
import { useScan } from '@/hooks/useScan';
import { useParts, useScenarios } from '@/hooks/useScenarios';
import { DENSITY_TOL, GUARD, RHO_REF, THRESHOLDS } from '@/lib/criteria';
import { USAGE_STAGE_LABEL, YS_SRC_LABEL } from '@/lib/labels';
import type { Proposal, Scenario, Screening, Usage } from '@/types/api';

// 편집 가능한 AI 문장 (기대 효과는 7절 표와 겹쳐 표시하지 않음)
type EditKey = 'summary' | 'judgment_basis' | 'machining_plan' | 'required_docs';

// 양식 고정 문구 (조직 정보)
const ORG: Record<'to' | 'cc' | 'from' | 'security' | 'retention' | 'reviewer' | 'approver', Bi> = {
  to: ['Head of Quality Assurance', '품질보증팀장'],
  cc: ['Production Engineering, Tooling Shop', '생산기술팀, 치공구 제작반'],
  from: ['Reforge AI Scan Station (Central Collection Yard)', 'Reforge AI 스캔 스테이션 (중앙 집하장)'],
  security: ['Internal use only', '사내 한정'],
  retention: ['Same as original lot quality records', '원 로트 품질기록과 동일'],
  reviewer: ['Production Engineering', '생산기술팀'],
  approver: ['Quality Assurance', '품질보증팀'],
};
const DECISION_DAYS = 7; // 결정 요청 기한 = 작성일 + 7일

// 용도별 문구: noun = 결과물 호칭, purpose = 용도 수식어, scope = 적용 범위, verify = 사용 전 검증 기준
const USAGE_TEXT: Record<Usage, { noun: Bi; purpose: Bi; scope: Bi; verify: Bi }> = {
  지그: { noun: ['fixture', '치구'], purpose: ['process use', '공정용'], scope: ['ground process fixtures', '지상 공정용 치구'], verify: ['Per tooling verification procedure', '치공구 검증 절차에 따름'] },
  목업: { noun: ['mock-up', '목업'], purpose: ['test/display use', '시험·전시용'], scope: ['ground test/display mock-ups', '지상 시험·전시용 목업'], verify: ['Per internal verification procedure', '사내 검증 절차에 따름'] },
  EM: { noun: ['EM', 'EM'], purpose: ['engineering model use', '엔지니어링 모델용'], scope: ['ground engineering models (EM)', '지상 엔지니어링 모델(EM)'], verify: ['Per internal verification procedure', '사내 검증 절차에 따름'] },
  보조도구: { noun: ['auxiliary tool', '보조도구'], purpose: ['process support', '공정 보조용'], scope: ['ground process auxiliary tools', '지상 공정용 보조도구'], verify: ['Per internal verification procedure', '사내 검증 절차에 따름'] },
};
const GRADE_ALIAS: Record<string, string> = { 'Ti-6Al-4V': 'Grade 5' };
const CRACK_TEXT: Record<string, Bi> = { none: ['No cracks', '균열 없음'], suspected: ['Cracks suspected', '균열 의심'], confirmed: ['Cracks confirmed', '균열 확정'] };
const CHEM_TEXT: Record<string, Bi> = { IN: ['Within certificate range', '성적서 범위 내'], BORDER: ['At certificate boundary', '성적서 경계'], OUT: ['Outside certificate range', '성적서 이탈'] };
// 스크랩 반납 시세 달러/kg (현행 처리 방식 비교용), 환율 가정
const SCRAP_USD_PER_KG: Record<string, [number, number]> = { Ti: [8.6, 11.5] };
const USD_KRW = 1400;

const VERDICT: Record<Screening, { short: Bi; tone: string }> = {
  GREEN: { short: ['Green · lot retained', '초록 · 로트 유지'], tone: 'green' },
  YELLOW: { short: ['Yellow · further check', '노랑 · 추가 확인'], tone: 'yellow' },
  RED: { short: ['Red · remelt', '빨강 · 용해 대상'], tone: 'red' },
};

const MEASURES: [key: string, label: Bi, unit: string][] = [
  ['oxide', ['Oxidized area', '산화 면적'], '%'], ['scratch', ['Scratch depth / thickness', '스크래치 깊이 / 두께'], '%'], ['deform', ['Deformation', '변형률'], '%'],
  ['oil', ['Residual oil', '오일 잔류'], 'wt.%'], ['dust', ['Dust / particles', '먼지 · 입자'], 'wt.%'], ['foreign', ['Foreign metal contamination', '이종금속 혼입'], 'wt.%'],
  ['coat', ['Coated area', '코팅 면적'], '%'],
];

const krw = (n: number, lang: string) => (lang === 'en' ? `KRW ${n.toLocaleString()}` : `${n.toLocaleString()} 원`);
const utilOf = (s: Scenario) => Math.round((s.breakdown.geometry / 20) * 100); // 시나리오 화면과 같은 정의
const fmtDate = (d: Date, lang: string) => d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR');

// num: 오른쪽 정렬할 숫자 열 인덱스, center: 가운데 정렬할 열 인덱스
function Table({ head, rows, num = [], center = [], className = '' }: {
  head: string[]; rows: ReactNode[][]; num?: number[]; center?: number[]; className?: string;
}) {
  const cls = (j: number) => (num.includes(j) ? 'num' : center.includes(j) ? 'center' : undefined);
  return (
    <table className={`doc-table ${className}`}>
      <thead><tr>{head.map((h, j) => <th key={h} className={cls(j)}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={cls(j)}>{c}</td>)}</tr>)}</tbody>
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

type Verdict = 'ok' | 'warn' | 'bad' | 'check';
const RESULT_LABEL: Record<Verdict, Bi> = { ok: ['Pass', '적합'], warn: ['Caution', '주의'], bad: ['Fail', '부적합'], check: ['Check needed', '확인 필요'] };
const RESULT_TONE: Record<Verdict, string> = { ok: 'ok', warn: 'warn', bad: 'bad', check: 'warn' };
const Result = ({ value }: { value: Verdict }) => {
  const { tr } = useLang();
  return <span className={`doc-result ${RESULT_TONE[value]}`}>{tr(...RESULT_LABEL[value])}</span>;
};

function Section({ title, edit, children }: { title: string; edit?: { on: boolean; toggle: () => void }; children: ReactNode }) {
  const { tr } = useLang();
  return (
    <section className="doc-sec">
      <h2>
        {title}
        {edit && <button className="doc-edit" onClick={edit.toggle}><Icon name={edit.on ? 'check' : 'edit'} /> {edit.on ? tr('Done', '완료') : tr('Edit', '편집')}</button>}
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

// 엔지니어 의견란: 화면에서 입력(저장 안 함), 인쇄 시 입력 내용 또는 손글씨용 빈칸
// react-to-print 복제 문서에는 textarea 값이 안 넘어가서 인쇄용 텍스트를 따로 둔다
function ReviewField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <>
      <textarea className="doc-review-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      <div className="doc-review-print">{value}</div>
    </>
  );
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

// 제안서 화면: 제안서 + 스캔·시나리오·부품으로 문서 구성. 편집 완료 시 PATCH /proposals/{proposalId}
export default function ProposalPage() {
  const navigate = useNavigate();
  const { tr, lang } = useLang();
  const org = Object.fromEntries(Object.entries(ORG).map(([k, v]) => [k, tr(...v)])) as Record<keyof typeof ORG, string>;
  const fd = (d: Date) => fmtDate(d, lang);
  const won$ = (n: number) => krw(n, lang);
  const proposalId = Number(useParams().proposalId);
  const proposalQuery = useProposal(proposalId);
  const scanId = proposalQuery.data?.scan_id ?? NaN;
  const scanQuery = useScan(scanId);
  // 조회만: 시나리오를 다시 생성하면 기존 제안서가 지워짐
  const scenariosQuery = useScenarios(scanId, { generate: false });
  const allParts = useParts().data ?? [];
  const save = useUpdateProposal(proposalId);
  const regenerate = useGenerateProposal();

  // 편집 중인 내용. 저장되면 비우고 서버 값을 다시 표시
  const [draft, setDraft] = useState<Proposal | null>(null);
  const proposal = draft ?? proposalQuery.data ?? null;
  const scan = scanQuery.data;
  const result = scenariosQuery.data;
  const loadError = proposalQuery.error ?? scanQuery.error ?? scenariosQuery.error;

  const [editing, setEditing] = useState<EditKey | null>(null);
  // TODO: 의견 저장이 필요해지면 PROPOSAL 컬럼 추가 + PATCH
  const [review, setReview] = useState({ reviewer: '', approver: '' });
  const paperRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: paperRef, documentTitle: proposal?.title ?? tr('Reforge AI Proposal', 'Reforge AI 제안서') });

  const update = (key: EditKey, value: string) => {
    if (!proposal) return;
    setDraft(key === 'summary'
      ? { ...proposal, summary: value }
      : { ...proposal, sections: { ...proposal.sections, [key]: value } });
  };
  // 편집을 마치면(완료 또는 다른 항목 편집 시작) 그 항목만 저장
  const saveField = (key: EditKey) => {
    if (!draft) return;
    const sent = draft;
    save.mutate(key === 'summary' ? { summary: sent.summary } : { sections: { [key]: sent.sections[key] } }, {
      onSuccess: () => setDraft((d) => (d === sent ? null : d)), // 저장 중에 더 고쳤으면 유지
    });
  };
  const edit = (key: EditKey) => ({
    on: editing === key,
    toggle: () => {
      if (editing) saveField(editing);
      setEditing(editing === key ? null : key);
    },
  });
  const regenerateProposal = () => {
    if (!proposal) return;
    regenerate.mutate({ scanId: proposal.scan_id, scenarioId: proposal.scenario_id }, {
      onSuccess: (p) => {
        setDraft(null);
        setEditing(null);
        navigate(`/proposals/${p.proposal_id}`);
      },
    });
  };
  const text = (key: EditKey) => (
    <Text
      value={key === 'summary' ? proposal!.summary : proposal!.sections[key]}
      editing={editing === key} onChange={(v) => update(key, v)}
    />
  );


  const doc = proposal && scan && result && (() => {
    const { lot, measure, condition: c } = scan;
    const scenarios = [...result.scenarios].sort((a, b) => a.rank - b.rank);
    const scenario = scenarios.find((s) => s.scenario_id === proposal.scenario_id) ?? scenarios[0];
    const parts = scenario.parts.map((p) => allParts.find((mp) => mp.part_id === p.part_id)).filter((p) => p != null);
    const main = parts[0];
    const target = scenario.parts.map((p) => `${p.part_id} ${p.name}`).join(', ');
    const created = new Date(proposal.created_at);
    const due = new Date(created.getTime() + DECISION_DAYS * 86400000);
    const revised = proposal.updated_at && proposal.updated_at !== proposal.created_at ? new Date(proposal.updated_at) : null;
    const verdict = scan.screening ? { tone: VERDICT[scan.screening].tone, short: tr(...VERDICT[scan.screening].short) } : null;
    const m = proposal.metrics;
    const util = Math.round(m.utilization * 100);
    const dims = measure.dim_mm ? measure.dim_mm.join(' × ') : null;
    const uText = USAGE_TEXT[scenario.usage];
    const u = { noun: tr(...uText.noun), purpose: tr(...uText.purpose), scope: tr(...uText.scope), verify: tr(...uText.verify) };
    const ids = scenario.parts.map((p) => p.part_id).join(', ');
    const names = scenario.parts.map((p) => `${p.name} ${p.part_id}`).join(', ');
    // 가공 계획: 한 면 제거 여유 a만큼 정삭한 가용 형상 (큰 순서)
    const allow = measure.allow_mm ?? 0;
    const usable = measure.dim_mm ? [...measure.dim_mm].map((d) => +(d - 2 * allow).toFixed(1)).sort((a, b) => b - a) : null;
    // 밀도: 질량 ÷ 외곽 치수 부피 (서버 판정과 같은 식)
    const rho = measure.dim_mm && measure.kg ? (measure.kg * 1000) / (measure.dim_mm.reduce((a, b) => a * b, 1) / 1000) : null;
    const rhoRef = RHO_REF[lot.grade];
    const scrapUsd = SCRAP_USD_PER_KG[lot.fam];
    const scrap = scrapUsd && measure.kg ? scrapUsd.map((usd) => ((measure.kg! * usd * USD_KRW) / 10000).toFixed(1)) : null;
    // 순회수 가치가 비슷한데 활용률이 낮은 대안이 있으면 그 이유로 제안 근거를 설명
    const alt = scenarios.find((s) => s !== scenario && s.nrv >= scenario.nrv * 0.9 && utilOf(s) < utilOf(scenario));
    return { scan, lot, measure, c, scenarios, scenario, parts, main, target, created, due, revised, verdict, m, util, dims,
      u, ids, names, allow, usable, rho, rhoRef, scrapUsd, scrap, alt,
      docNo: `RF-PRP-${lot.lot_id.replace(/^LOT-/, '')}-${String(proposal.proposal_id).padStart(2, '0')}` };
  })();

  return (
    <main className="proposal-page">
      <div className="proposal-top">
        <div><p>RECYCLING PROPOSAL</p><h1>{tr('Recycling Proposal', '재활용 제안서')}</h1><span>{tr('Review the AI-generated content and edit any item as needed.', 'AI가 생성한 내용을 검토하고 필요한 항목을 직접 편집할 수 있습니다.')}</span></div>
      </div>
      <div className="proposal-workspace">
        <div className="paper official" ref={paperRef}>
          {loadError ? (
            <div className="error-card">
              <div className="error-icon"><Icon name="x" /></div>
              <h2>{tr('Failed to load the proposal.', '제안서를 불러오지 못했습니다.')}</h2>
              <p>{getErrorMessage(loadError)}</p>
              <button className="secondary-button" onClick={() => navigate('/')}><Icon name="refresh" /> {tr('Scan again', '다시 스캔')}</button>
            </div>
          ) : !proposal || !doc || regenerate.isPending ? <ProposalSkeleton /> : (
            <>
              <div className="doc-running">REFORGE AI · {tr('Scrap Reuse Disposition Proposal', '자투리 재사용 처분 제안서')} &nbsp;|&nbsp; {doc.docNo} &nbsp;Rev.0</div>

              <table className="doc-meta">
                <tbody>
                  <tr><th>{tr('Document no.', '문서번호')}</th><td>{doc.docNo}</td><th>{tr('Revision', '개정')}</th><td>Rev.0 ({doc.revised ? tr(`last revised ${fd(doc.revised)}`, `최종 수정 ${fd(doc.revised)}`) : tr('initial draft', '최초 작성')})</td></tr>
                  <tr><th>{tr('Date', '작성일')}</th><td>{fd(doc.created)}</td><th>{tr('Retention', '보존 기한')}</th><td>{org.retention}</td></tr>
                  <tr><th>{tr('To', '수신')}</th><td>{org.to}</td><th>{tr('Cc', '참조')}</th><td>{org.cc}</td></tr>
                  <tr><th>{tr('From', '발신')}</th><td>{org.from}</td><th>{tr('Classification', '보안 등급')}</th><td>{org.security}</td></tr>
                </tbody>
              </table>

              <div className="doc-subject">
                <h1>{proposal.title}</h1>
              </div>

              <div className="doc-hero">
                <div className="from">
                  <span>{tr('Current (to be reused)', '현재 (재사용 대상)')}</span>
                  <strong>{doc.lot.grade} {tr('remnant', '잔재')}</strong>
                  <small>{doc.lot.lot_id}<br />{doc.dims ? `${doc.dims} mm · ` : ''}{doc.measure.kg} kg</small>
                </div>
                <div className="arrow"><b>{tr('Reuse ▶', '재사용 ▶')}</b><small>{tr('without remelting', '용해 없이')}</small></div>
                <div className="to">
                  <span>{tr('Proposed destination', '재활용처 (제안)')}</span>
                  <strong>{doc.target}</strong>
                  <small>{[tr(`Ground ${doc.u.purpose}`, `지상 ${doc.u.purpose}`), doc.main ? tr(...USAGE_STAGE_LABEL[doc.main.stage]) : null, tr(`${doc.m.reprocess_count} setup(s)`, `${doc.m.reprocess_count}회 셋업`)].filter(Boolean).join(' · ')}</small>
                </div>
              </div>
              <div className="doc-kpis">
                <div><span>{tr('Verdict', '판정')}</span><strong className={doc.verdict?.tone}>{doc.verdict?.short ?? '—'}</strong></div>
                <div><span>{tr('Net recovery value', '순회수 가치')}</span><strong>{won$(doc.m.saved_krw)}</strong></div>
                <div><span>{tr('Material utilization', '소재 활용률')}</span><strong>{doc.util} %</strong></div>
                <div><span>{tr('Decision due', '결정 요청 기한')}</span><strong>{fd(doc.due)}</strong></div>
              </div>

              <Section title={tr('1. Purpose', '1. 목적')} edit={edit('summary')}>{text('summary')}</Section>

              <Section title={tr('2. Request and Decision Required', '2. 요청 사항 및 결정 요구')}>
                <KeyValue rows={[
                  [tr('Disposition requested', '처분 요청'), tr(`Reuse (change of use: raw-material remnant → ${doc.names} for ${doc.u.purpose})`, `재사용 (용도 변경: 원자재 잔재 → ${doc.u.purpose} ${doc.names})`)],
                  [tr('Scope', '적용 범위'), doc.parts.some((p) => p.safety_critical)
                    ? tr('Safety-critical part. Strength values from a certificate (measured / mill cert) are required.', '안전 중요 부품. 성적서(실측·재질증명서) 강도값 필수')
                    : tr(`Not a flight part. Limited to ${doc.u.scope}.`, `비행 부품 아님. ${doc.u.scope}에 한정`)],
                  [tr('Decision deadline', '결정 요구 기한'), tr(`${fd(doc.due)} (within drop-stock rack storage period)`, `${fd(doc.due)} (드롭 재고 랙 보관 기간 내)`)],
                  [tr('Follow-up on approval', '승인 시 후속 조치'), tr('Confirm laser ID marking → Production Engineering issues machining order', '레이저 식별 각인 확정 → 생산기술팀 가공 지시 발행')],
                ]} />
              </Section>

              <Section title={tr('3. Remnant Identification and Traceability', '3. 대상 잔재 식별 및 추적성')}>
                <KeyValue rows={[
                  [tr('Original lot no.', '원 로트 번호'), doc.lot.lot_id],
                  [tr('Material · temper', '소재 · 질별'), `${doc.lot.grade}${GRADE_ALIAS[doc.lot.grade] ? ` (${GRADE_ALIAS[doc.lot.grade]})` : ''}${doc.lot.temper ? `, ${doc.lot.temper}` : ''}`],
                  [tr('Mill certificate', '재질증명서'), doc.lot.cert ? tr('On file (original must be verified · Attachment 1)', '보유 (원본 대조 완료 필요 · 첨부 1)') : tr('Not on file', '미보유')],
                  [tr('Remnant size · mass', '잔재 치수 · 질량'), `${doc.dims ? `${doc.dims} mm · ` : ''}${doc.measure.kg} kg`],
                  [tr('Identification mark', '식별 표시'), tr('Data Matrix laser marking (confirmed after approval)', '데이터매트릭스 레이저 각인 (승인 후 확정)')],
                  [tr('Traceability chain', '추적 계보'), tr(`Raw material ${doc.lot.lot_id} → remnant → ${doc.u.noun} ${doc.ids} (original lot no. carried to the ${doc.u.noun} ID mark)`, `원자재 ${doc.lot.lot_id} → 잔재 → ${doc.u.noun} ${doc.ids} (${doc.u.noun} 식별 표시에 원 로트 번호 이관)`)],
                ]} />
              </Section>

              <Section title={tr('4. Assessment Results', '4. 판정 결과')} edit={edit('judgment_basis')}>
                <h3>{tr('A. Results by measured item', '가. 측정 항목별 결과')}</h3>
                <Table head={[tr('Item', '항목'), tr('Measured', '측정값'), tr('Green threshold (incl. guard band)', '초록 기준 (가드밴드 반영)'), tr('Result', '결과')]} num={[1, 2]} center={[3]} rows={[
                  ...MEASURES.map(([key, label, unit]) => {
                    const v = doc.c?.[key as keyof typeof doc.c] as number | null | undefined;
                    // 초록 = G - w 이하, 노랑(주의) = G - w 초과 ~ Y, 부적합 = Y 초과
                    const [g, y] = THRESHOLDS[key];
                    const green = +(g - GUARD[key]).toFixed(3);
                    return [tr(...label), v == null ? '—' : `${v} ${unit}`, tr(`≤ ${green} ${unit}`, `${green} ${unit} 이하`), v == null ? '—' : <Result value={v <= green ? 'ok' : v <= y ? 'warn' : 'bad'} />];
                  }),
                  [tr('Density check', '밀도 대조'), doc.rho == null ? '—' : `${doc.rho.toFixed(2)} g/cm³`, doc.rhoRef ? tr(`${doc.lot.grade} ref. ${doc.rhoRef.toFixed(2)} ± ${DENSITY_TOL * 100} %`, `${doc.lot.grade} 기준 ${doc.rhoRef.toFixed(2)} ± ${DENSITY_TOL * 100} %`) : '—',
                    doc.scan.density_err == null ? '—' : <Result value={doc.scan.density_err <= DENSITY_TOL ? 'ok' : 'warn'} />],
                  [tr('Cracks · composition', '균열 · 화학조성'), `${doc.c?.crack ? tr(...CRACK_TEXT[doc.c.crack]) : tr('Cracks —', '균열 —')} · ${doc.c?.chem ? tr(...CHEM_TEXT[doc.c.chem]) : tr('Composition —', '화학조성 —')}`, '—',
                    <Result value={doc.c?.crack === 'none' && doc.c?.chem === 'IN' ? 'ok' : 'check'} />],
                ]} />
                <h3>{tr('B. Material basis', '나. 재질 근거')}</h3>
                <p className="doc-text doc-indent">
                  {doc.lot.ys != null && doc.main
                    ? tr(
                      `Yield strength of ${doc.lot.ys} MPa (${doc.lot.ys_src ? tr(...YS_SRC_LABEL[doc.lot.ys_src]) : ''}) ${doc.lot.ys >= doc.main.min_ys ? 'meets' : 'does not meet'} the ${doc.main.part_id} requirement of ${doc.main.min_ys} MPa (strength ratio ${(doc.lot.ys / doc.main.min_ys).toFixed(2)}).`,
                      `${doc.lot.ys_src ? tr(...YS_SRC_LABEL[doc.lot.ys_src]) : ''} 기준 항복강도 ${doc.lot.ys} MPa로, ${doc.main.part_id} 요구 항복강도 ${doc.main.min_ys} MPa를 ${doc.lot.ys >= doc.main.min_ys ? '충족합니다' : '충족하지 못합니다'}(강도비 ${(doc.lot.ys / doc.main.min_ys).toFixed(2)}).`)
                    : tr('No lot yield-strength value is available, so the assessment uses the material typical value.', '로트 항복강도 값이 없어 소재 대표값 기준으로 평가했습니다.')}
                  {' '}{tr('Internal defects and composition inherit the incoming-inspection record of the raw material and are not re-inspected.', '내부 결함·화학조성은 원자재 입고 시 검사 기록을 승계하며 재검사하지 않습니다.')}
                </p>
                <h3>{tr('C. Assessment opinion', '다. 판정 의견')}</h3>
                <div className="doc-indent">{text('judgment_basis')}</div>
              </Section>

              <Section title={tr('5. Reuse Plan and Alternatives', '5. 재사용 방안 및 대안 비교')}>
                <Table head={[tr('Candidate', '후보'), tr('Use stage', '활용 단계'), tr('Priority score', '우선순위 점수'), tr('Net recovery value', '순회수 가치'), tr('Remarks', '비고')]} num={[2, 3]} rows={[
                  ...doc.scenarios.map((s) => {
                    const stage = allParts.find((p) => p.part_id === s.parts[0]?.part_id)?.stage;
                    const name = s.parts.map((p) => `${p.part_id} ${p.name}`).join(', ');
                    const chosen = s.scenario_id === doc.scenario.scenario_id;
                    const note = chosen ? tr(`Material utilization ${utilOf(s)} %`, `소재 활용률 ${utilOf(s)} %`)
                      : utilOf(s) < utilOf(doc.scenario) ? tr(`Low utilization (${utilOf(s)} %)`, `활용률 ${utilOf(s)} %로 낮음`)
                      : s.nrv < doc.scenario.nrv ? tr('Lower value', '가치 낮음') : '—';
                    return [chosen ? <b>{name} {tr('(proposed)', '(제안)')}</b> : name, stage ? tr(...USAGE_STAGE_LABEL[stage]) : '—', tr(`${s.score} (rank ${s.rank})`, `${s.score} (${s.rank}위)`), won$(s.nrv), note];
                  }),
                  ...(doc.scrap ? [[tr('Ref.: scrap return', '참고: 스크랩 반납'), tr('Remelting', '재용해'), '—', tr(`approx. KRW ${doc.scrap[0]}–${doc.scrap[1]} ×10,000`, `약 ${doc.scrap[0]}~${doc.scrap[1]}만 원`), tr('Current practice', '현행 처리 방식')]] : []),
                ]} />
                <p className="doc-text doc-indent doc-gap">
                  {doc.alt
                    ? tr(`${doc.alt.parts[0].part_id} has a similar net recovery value but a lower material utilization, so most of the remnant would end up as chips again. We therefore propose ${doc.ids} based on the priority ranking that weighs utilization and demand together.`, `${doc.alt.parts[0].part_id}는 순회수 가치가 비슷하지만 소재 활용률이 낮아 잔재 대부분이 다시 칩으로 버려지므로, 활용률과 수요를 함께 반영한 우선순위에 따라 ${doc.ids}을 제안합니다.`)
                    : tr(`We propose ${doc.ids} based on the priority ranking that weighs utilization and demand together.`, `활용률과 수요를 함께 반영한 우선순위에 따라 ${doc.ids}을 제안합니다.`)}
                  {doc.scrapUsd && tr(` Scrap return value is estimated from the ${doc.lot.grade} scrap price (approx. USD ${doc.scrapUsd[0]}–${doc.scrapUsd[1]}/kg, assuming ${USD_KRW.toLocaleString()} KRW/USD).`, ` 스크랩 반납 가치는 ${doc.lot.grade} 스크랩 시세(약 ${doc.scrapUsd[0]}~${doc.scrapUsd[1]}달러/kg, 환율 ${USD_KRW.toLocaleString()}원 가정) 기준 추정입니다.`)}
                </p>
              </Section>

              <Section title={tr('6. Machining and Inspection Plan', '6. 가공 및 검사 계획')} edit={edit('machining_plan')}>
                <Table head={[tr('No.', '순서'), tr('Process', '공정'), tr('Inspection · criteria', '검사 · 기준')]} className="steps" rows={[
                  [tr('Washing · degreasing', '세척 · 탈지'), tr('Visual check (no residual oil)', '외관 육안 확인 (오일 잔류 없음)')],
                  ...(doc.allow && doc.usable ? [[tr(`Finish ${doc.allow} mm off each face (usable shape ${doc.usable.join(' × ')} mm)`, `각 면 ${doc.allow} mm 정삭 (가용 형상 ${doc.usable.join(' × ')} mm)`), tr('Dimension check', '치수 확인')]] : []),
                  [tr(`${doc.u.noun} machining (${doc.m.reprocess_count} setup(s))`, `${doc.u.noun} 형상 가공 (${doc.m.reprocess_count}회 셋업)`), tr('100% inspection of key dimensions per drawing', '도면 기준 주요 치수 전수 검사')],
                  [tr('Transfer original lot no. by marking', '원 로트 번호 이관 각인'), tr('Verify mark is readable', '식별 표시 판독 확인')],
                  [tr(`Pre-use verification of ${doc.u.noun}`, `${doc.u.noun} 사용 전 검증`), doc.u.verify],
                ].map((row, i) => [i + 1, ...row])} />
                <p className="doc-text doc-indent doc-gap">
                  {tr(`${doc.allow ? 'Existing ID marks on the remnant surface are removed by finishing, so after machining ' : 'After machining, '}the original lot no. is re-marked on the ${doc.u.noun} and the lineage is recorded in the system.`, `${doc.allow ? '잔재 표면의 기존 식별 표시는 정삭으로 제거되므로, ' : ''}가공 완료 후 ${doc.u.noun}에 원 로트 번호를 다시 표시하고 계보를 시스템에 기록합니다.`)}
                </p>
                <div className="doc-indent doc-gap">{text('machining_plan')}</div>
              </Section>

              <Section title={tr('7. Expected Benefits', '7. 기대 효과')}>
                <KeyValue rows={[
                  [tr('Net recovery value', '순회수 가치'), tr(`${won$(doc.m.saved_krw)} (replacement value ${won$(doc.scenario.sell_price)} − machining/inspection/logistics ${won$(doc.scenario.sell_price - doc.m.saved_krw)})`, `${won$(doc.m.saved_krw)} (대체 가치 ${won$(doc.scenario.sell_price)} − 가공·검사·물류비 ${won$(doc.scenario.sell_price - doc.m.saved_krw)})`)],
                  [tr('Material utilization', '소재 활용률'), tr(`${doc.util} % (${doc.u.noun} ${doc.m.saved_kg} kg ÷ remnant ${doc.measure.kg} kg)`, `${doc.util} % (${doc.u.noun} ${doc.m.saved_kg} kg ÷ 잔재 ${doc.measure.kg} kg)`)],
                  [tr('New raw material', '신규 원자재'), tr(`Avoids 1 new purchase of ${doc.lot.grade} for making ${doc.ids}`, `${doc.ids} 제작용 ${doc.lot.grade} 신규 구매 1건 회피`)],
                  [tr('Additional benefits', '부가 효과'), tr('Keeps the remnant out of the remelting route; builds material circulation history', '잔재의 재용해 경로 진입 방지, 소재 순환 이력 축적')],
                ]} />
              </Section>

              <Section title={tr('8. Risks and Limitations', '8. 위험 요소 및 제한 사항')}>
                <ol className="doc-list ga">
                  <li>{tr(`This disposition is limited to ${doc.u.scope} and does not apply to flight parts or customer deliverables.`, `본 처분은 ${doc.u.scope}에 한정하며, 비행 부품 및 고객 납품품에는 적용하지 않습니다.`)}</li>
                  <li>{tr('Net recovery value is an estimate based on internal standard unit prices; actual cost is fixed by the Production Engineering quotation.', '순회수 가치는 사내 기준 단가 기반 추정치이며, 실제 원가는 생산기술팀 견적으로 확정합니다.')}</li>
                  <li>{tr('Guard-band values for the measurement criteria are initial system values and are being calibrated through repeated periodic measurements.', '측정 기준의 가드밴드 값은 시스템 초기값으로, 정기 반복 측정을 통해 보정 중입니다.')}</li>
                  {doc.scan.yellow_actions.length > 0 && (
                    <li>{tr(`Approval requires passing the additional check actions (${doc.scan.yellow_actions.map((a) => a.action).join(', ')}); dimensions are rechecked after surface cutting.`, `추가 확인 조치(${doc.scan.yellow_actions.map((a) => a.action).join(', ')})를 통과한 뒤 승인해야 하며, 표면 절삭 시 치수를 다시 확인합니다.`)}</li>
                  )}
                </ol>
              </Section>

              <Section title={tr('9. Attachments', '9. 붙임')} edit={edit('required_docs')}>
                {editing === 'required_docs' ? text('required_docs') : (
                  <ol className="doc-list">
                    {doc.lot.cert && <li>{tr(`Copy of original lot mill certificate (${doc.lot.lot_id})`, `원 로트 재질증명서 사본 (${doc.lot.lot_id})`)}</li>}
                    <li>{tr('Scan station measurement record (photos, dimensions, weight, assessment log)', '스캔 스테이션 측정 기록 (사진, 치수, 무게, 판정 로그)')}</li>
                    <li>{tr('Priority score breakdown (5-axis scores)', '우선순위 산정 내역 (5개 축 점수)')}</li>
                    <li>{tr(`${doc.ids} ${doc.u.noun} drawing (to be prepared by Production Engineering)`, `${doc.ids} ${doc.u.noun} 도면 (생산기술팀 작성 예정)`)}</li>
                    {/* AI 필요 서류 중 위 고정 항목(재질증명서 사본)과 겹치지 않는 것 */}
                    {proposal.sections.required_docs.split('\n').map((d) => d.trim())
                      .filter((d) => d && !(doc.lot.cert && /재질증명서|LOT 성적서/.test(d)))
                      .map((d) => <li key={d}>{d}</li>)}
                  </ol>
                )}
                <div className="doc-end">{tr('End.', '끝.')}</div>
              </Section>

              <table className="doc-review">
                <tbody>
                  <tr>
                    <th>{tr('Review comments', '검토 의견')}<small>{org.reviewer}</small></th>
                    <td><ReviewField value={review.reviewer} onChange={(v) => setReview({ ...review, reviewer: v })} placeholder={tr('Enter review comments (not saved; included in print)', '검토 의견을 입력하세요 (저장되지 않으며 인쇄에 포함됩니다)')} /></td>
                  </tr>
                  <tr>
                    <th>{tr('Approval conditions · comments', '승인 조건 · 의견')}<small>{org.approver}</small></th>
                    <td><ReviewField value={review.approver} onChange={(v) => setReview({ ...review, approver: v })} placeholder={tr('State conditions if approving conditionally', '조건부 승인 시 조건을 기재하세요')} /></td>
                  </tr>
                </tbody>
              </table>

              <table className="doc-sign">
                <thead><tr><th>{tr('Role', '구분')}</th><th>{tr('Prepared', '작성')}</th><th>{tr('Reviewed', '검토')}</th><th>{tr('Approved', '승인')}</th></tr></thead>
                <tbody>
                  <tr><th>{tr('Dept.', '소속')}</th><td>Reforge AI ({tr('auto-generated', '자동 생성')})</td><td>{org.reviewer}</td><td>{org.approver}</td></tr>
                  <tr><th>{tr('Name', '성명')}</th><td>—</td><td /><td /></tr>
                  <tr className="tall"><th>{tr('Signature · date', '서명 · 일자')}</th><td>{fd(doc.created)}</td><td /><td /></tr>
                  <tr><th>{tr('Decision', '결정')}</th><td colSpan={3}>{tr('□ Approve   □ Approve with conditions   □ Reject   □ Hold', '□ 승인   □ 조건부 승인   □ 반려   □ 보류')}</td></tr>
                </tbody>
              </table>
              <p className="doc-history"><b>{tr('Revision history', '개정 이력')}</b> Rev.0 · {fd(doc.created)} · {tr('Initial draft (auto-generated by Reforge AI)', '최초 작성 (Reforge AI 자동 생성)')}{doc.revised && ` · ${fd(doc.revised)} ${tr('content revised', '내용 수정')}`}</p>
              <p className="doc-ai"><b>{tr('AI disclosure', 'AI 생성 고지')}</b> {tr('The body text was written by AI from system-calculated values; final responsibility for figures and assessments rests with the approving authority.', '본문 문장은 시스템 계산값을 바탕으로 AI가 작성했으며, 수치·판정의 최종 책임은 결재권자에게 있습니다.')}</p>
              <div className="doc-foot">{tr('This document is a draft generated by Reforge AI and takes effect only after review and signature by the approving authority.', '본 문서는 Reforge AI가 생성한 초안이며, 승인권자의 검토·서명 후 효력이 발생한다.')}</div>
            </>
          )}
        </div>
        <div className="action-stack">
          <div className="proposal-state">
            <Icon name="edit" className="size-4" />
            {save.isPending ? tr('Saving…', '저장 중…') : save.error ? `${tr('Save failed', '저장 실패')}: ${getErrorMessage(save.error)}` : regenerate.error ? `${tr('Generation failed', '생성 실패')}: ${getErrorMessage(regenerate.error)}` : tr('Editable', '편집 가능')}
          </div>
          <aside className="floating-actions">
            <span>{tr('Document actions', '문서 작업')}</span>
            <button onClick={() => print()}><Icon name="download" /> {tr('Save as PDF', 'PDF 저장')}</button>
            <button onClick={() => print()}><Icon name="print" /> {tr('Print', '인쇄')}</button>
            <button onClick={regenerateProposal} disabled={!proposal || regenerate.isPending}>
              <Icon name="refresh" /> {regenerate.isPending ? tr('Generating…', '생성 중…') : tr('Regenerate', '다시 생성')}
            </button>
            <div><Icon name="check" /><p><strong>{tr('Ready for review', '검토 준비 완료')}</strong>{tr('9 sections drafted', '9개 항목 작성됨')}</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}

