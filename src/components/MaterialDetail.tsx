import { RHO_REF, SCORE_GREEN, SCORE_REVIEW, SCORE_YELLOW } from '@/lib/criteria';
import { YS_SRC_LABEL, reasonLabel } from '@/lib/labels';
import type { ScanDetail } from '@/types/api';

const TEMPER_LABEL: Record<string, string> = { annealed: '풀림 처리', T6: '용체화 후 인공시효', T651: '용체화·인공시효·응력 제거' };
const CHEM_DESC: Record<string, string> = { IN: '허용 합금 규격 범위 내', BORDER: '허용 규격 경계', OUT: '허용 규격 이탈' };
const CRACK_DESC: Record<string, string> = { none: '없음', suspected: '의심', confirmed: '확정' };

const val = (v: number | null | undefined, unit: string, digits?: number) =>
  v == null ? '—' : `${digits != null ? v.toFixed(digits) : v}${unit}`;
const join = (...parts: string[]) => parts.join('  ·  ');

type Item = [label: string, value: string];

// 정보는 표(info-table), 측정값은 한 줄 칸(measure-grid)
function Group({ no, title, items, cells }: { no: string; title: string; items: Item[]; cells: boolean }) {
  return (
    <section>
      <div className="section-kicker">{no} {title}</div>
      {cells ? (
        <div className="measure-grid">
          {items.map(([k, v]) => <div className="measure-cell" key={k}><span>{k}</span><strong>{v}</strong></div>)}
        </div>
      ) : (
        <div className="info-table">
          {items.map(([k, v]) => <div className="info-row" key={k}><span>{k}</span><strong>{v}</strong></div>)}
        </div>
      )}
    </section>
  );
}

// 원소재 검증 세부 데이터. 분석 결과 화면은 AI 판정 근거(04) 제외, 시나리오 화면은 포함
// hideSummary: 상단 로트 요약 바에 이미 있는 항목(로트 번호·합금·열처리·질량·치수) 생략
export default function MaterialDetail({ scan, withJudgment = false, hideSummary = false }: {
  scan: ScanDetail; withJudgment?: boolean; hideSummary?: boolean;
}) {
  const { lot, measure, condition: c } = scan;
  const done = scan.status === 'done';
  const dims = measure.dim_mm;
  const rhoRef = RHO_REF[lot.grade];
  // 계산 밀도 = 질량 ÷ 외곽 치수 부피 (서버 판정과 같은 식)
  const rho = dims && measure.kg ? (measure.kg * 1000) / ((dims[0] * dims[1] * dims[2]) / 1000) : null;
  const temper = lot.temper
    ? `${lot.temper[0].toUpperCase()}${lot.temper.slice(1)}${TEMPER_LABEL[lot.temper] ? ` (${TEMPER_LABEL[lot.temper]})` : ''}`
    : '—';

  // 표시되는 항목만 01부터 차례로 번호 매김 (판정 전에는 측정값 항목이 빠짐)
  const groups: [title: string, items: Item[], show: boolean, cells?: boolean][] = [
    ['소재 상세 정보', [
      ...(hideSummary ? [] : [
        ['로트 번호', lot.lot_id],
        ['합금', lot.grade],
        ['열처리 상태', temper],
        ['질량', val(measure.kg, ' kg')],
        ['치수', dims ? `${dims.join(' × ')} mm` : '—'],
      ] satisfies Item[]),
      ['계산 밀도', rho == null ? '—' : `${rho.toFixed(2)} g/cm³`],
      ['기준 밀도', rhoRef ? `${rhoRef.toFixed(2)} g/cm³` : '—'],
    ], true],
    ['화학적 특성', c ? [
      ['화학조성 적합 여부', c.chem ? join(c.chem, CHEM_DESC[c.chem]) : '—'],
      ['이종금속', val(c.foreign, ' wt.%', 2)],
      ['오일 · 절삭유', val(c.oil, ' wt.%', 2)],
      ['먼지', val(c.dust, ' wt.%', 2)],
    ] : [], done && !!c, true],
    ['소재 결함 및 상태', c ? [
      ['산화', val(c.oxide, '%')],
      ['부식', val(c.corr, '%')],
      ['코팅', val(c.coat, '%')],
      ['균열', c.crack ? CRACK_DESC[c.crack] : '—'],
      ['변형률', val(c.deform, '%')],
    ] : [], done && !!c, true],
    ['AI 판정 근거', [
      ['상태 점수 C', scan.condition_score != null ? join(`${scan.condition_score} / 100`, scan.screening ?? '—') : join('산정 안 함', scan.screening ?? '—')],
      ['판정 기준', `GREEN ≥${SCORE_GREEN}  /  검토 필요 ${SCORE_REVIEW}~<${SCORE_GREEN}  /  YELLOW ${SCORE_YELLOW}~<${SCORE_REVIEW}  /  RED <${SCORE_YELLOW}`],
      ['주요 판단 근거', scan.reason_codes.length
        ? `${scan.reason_codes.map(reasonLabel).join(', ')} 반영`
        : '즉시 RED 조건 없음. 미량 혼입·오염 및 표면·변형 측정값을 반영'],
    ], withJudgment && done],
    ['데이터 신뢰성', [
      ['성적서 보유 여부', lot.cert ? '보유' : '미보유'],
      ['물성 데이터 출처', lot.ys_src ? join(`${lot.ys_src} 등급`, `${YS_SRC_LABEL[lot.ys_src]} 기반 항복강도 데이터`) : '강도값 없음 (소재 대표값 사용)'],
    ], true],
  ];

  return (
    <div className="material-detail">
      {groups.filter(([, , show]) => show).map(([title, items, , cells = false], i) => (
        <Group key={title} no={String(i + 1).padStart(2, '0')} title={title} items={items} cells={cells} />
      ))}
    </div>
  );
}
