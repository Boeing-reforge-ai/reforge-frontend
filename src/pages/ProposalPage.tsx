import { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { AiBadge, BrandLogo } from '@/components/Brand';
import Icon from '@/components/Icon';
import { won } from '@/lib/labels';
import { mockProposal, mockScan } from '@/mocks/data';
import type { Proposal } from '@/types/api';

type SectionKey = 'summary' | 'material' | 'judgment_basis' | 'required_docs' | 'machining_plan' | 'expected_effect';

function MetricBox({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return <div className="proposal-metric"><span>{label}</span><strong>{value}<small>{unit}</small></strong></div>;
}

function EditableSection({ number, title, value, editable, editing, onToggle, onChange }: {
  number: string; title: string; value: string; editable: boolean; editing: boolean; onToggle: () => void; onChange: (v: string) => void;
}) {
  return (
    <section className="document-section">
      <div className="document-section-head">
        <div><span>{number}</span><h2>{title}</h2></div>
        {editable && <button onClick={onToggle}><Icon name={editing ? 'check' : 'edit'} /> {editing ? '완료' : '편집'}</button>}
      </div>
      {editing ? <textarea value={value} onChange={(e) => onChange(e.target.value)} autoFocus /> : <p>{value}</p>}
    </section>
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

// TODO: GET /proposals/{proposalId}로 교체, 편집 완료 시 PATCH /proposals/{proposalId}
export default function ProposalPage() {
  const scan = mockScan;
  const [proposal, setProposal] = useState<Proposal | null>(mockProposal);
  const [editing, setEditing] = useState<SectionKey | null>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const print = useReactToPrint({ contentRef: paperRef, documentTitle: proposal?.title ?? 'Reforge AI 제안서' });

  const [w, d, h] = scan.measure.dim_mm ?? [0, 0, 0];
  const sections: [string, string, SectionKey, string][] = proposal ? [
    ['01', '요약', 'summary', proposal.summary],
    ['02', '소재 분석', 'material', `${scan.lot.grade} (${scan.lot.temper}) 소재로, 재질증명서 ${scan.lot.cert ? '보유' : '미보유'} 상태입니다. 잔여 치수는 ${w} × ${d} × ${h} mm, 중량은 ${scan.measure.kg} kg이며 상태 점수 ${scan.condition_score} ${scan.screening}입니다.`],
    ['03', '판정 근거', 'judgment_basis', proposal.sections.judgment_basis],
    ['04', '필요 서류', 'required_docs', proposal.sections.required_docs],
    ['05', '가공 계획', 'machining_plan', proposal.sections.machining_plan],
    ['06', '기대 효과', 'expected_effect', proposal.sections.expected_effect],
  ] : [];

  const update = (key: SectionKey, value: string) => {
    if (!proposal || key === 'material') return;
    setProposal(key === 'summary'
      ? { ...proposal, summary: value }
      : { ...proposal, sections: { ...proposal.sections, [key]: value } });
  };

  return (
    <main className="proposal-page">
      <div className="proposal-top">
        <div><p>RECYCLING PROPOSAL</p><h1>재활용 제안서</h1><span>AI가 생성한 내용을 검토하고 필요한 항목을 직접 편집할 수 있습니다.</span></div>
      </div>
      <div className="proposal-workspace">
        <div className="paper" ref={paperRef}>
          {!proposal ? <ProposalSkeleton /> : (
            <>
              <div className="document-header">
                <div className="document-brand"><BrandLogo variant="document" /></div>
                <div className="document-meta">
                  <span>작성일<strong>{new Date(proposal.created_at).toLocaleDateString('ko-KR')}</strong></span>
                  <span>로트 번호<strong>{scan.lot.lot_id}</strong></span>
                </div>
                <div className="document-title">
                  <span>SCRAP RECYCLING PROPOSAL</span>
                  <h1>{proposal.title}</h1>
                  <p>항공우주 소재 순환을 위한 AI 기반 재활용 검토</p>
                </div>
              </div>
              <div className="proposal-metrics">
                <MetricBox label="재료 활용률" value={Math.round(proposal.metrics.utilization * 100)} unit="%" />
                <MetricBox label="가공 횟수" value={proposal.metrics.reprocess_count} unit="회" />
                <MetricBox label="절감 소재" value={proposal.metrics.saved_kg} unit="kg" />
                <MetricBox label="순회수 가치" value={won(proposal.metrics.saved_krw)} unit="" />
              </div>
              <div className="ai-document-note"><AiBadge /> 아래 본문은 선택한 시나리오와 시스템 계산값을 기반으로 생성되었습니다.</div>
              <div className="document-sections">
                {sections.map(([number, title, key, value]) => (
                  <EditableSection
                    key={key} number={number} title={title} value={value}
                    editable={key !== 'material'} editing={editing === key}
                    onToggle={() => setEditing(editing === key ? null : key)}
                    onChange={(v) => update(key, v)}
                  />
                ))}
              </div>
              <div className="document-footer"><span>REFORGE AI · GENERATED DOCUMENT</span><span>1 / 1</span></div>
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
            <div><Icon name="check" /><p><strong>검토 준비 완료</strong>{sections.length}개 섹션 생성됨</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
