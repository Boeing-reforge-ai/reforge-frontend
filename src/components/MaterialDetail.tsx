import { RHO_REF } from '@/lib/criteria';
import { SCREENING_LABEL, YS_SRC_LABEL, reasonLabel } from '@/lib/labels';
import type { ScanDetail } from '@/types/api';

const TEMPER_LABEL: Record<string, string> = { annealed: '풀림 처리', T6: '용체화 후 인공시효', T651: '용체화·인공시효·응력 제거' };
const CHEM_DESC: Record<string, string> = { IN: '허용 합금 규격 범위 내', BORDER: '허용 규격 경계', OUT: '허용 규격 이탈' };
const CRACK_DESC: Record<string, string> = { none: '없음', suspected: '의심', confirmed: '확정' };

const val = (v: number | null | undefined, unit: string, digits?: number) =>
  v == null ? '—' : `${digits != null ? v.toFixed(digits) : v}${unit}`;
const join = (...parts: string[]) => parts.join('  ·  ');

// 항목 표시: recheck = 노랑 재검 대상, reject = 빨강 용해 사유
type Mark = 'recheck' | 'reject' | undefined;
type Item = [label: string, value: string, mark?: Mark];

const MARK_TAG = { recheck: '재검', reject: '용해 사유' };
const Tag = ({ mark }: { mark: Mark }) => (mark ? <em className={`mark-tag ${mark}`}>{MARK_TAG[mark]}</em> : null);

// 빨강 사유 코드 → 항목 키. coat_over·deform_over는 제거·교정 가능(노랑)이라 제외
const RED_CODE_KEY: Record<string, string> = {
  chem_out: 'chem', crack_confirmed: 'crack', foreign_hard: 'foreign', oil_hard: 'oil', coat_hard: 'coat', straighten_hard: 'deform',
  foreign_over: 'foreign', oil_over: 'oil', dust_over: 'dust', oxide_over: 'oxide', corr_over: 'corr', scratch_over: 'scratch',
};

// 정보는 표(info-table), 측정값은 한 줄 칸(measure-grid)
function Group({ no, title, items, cells }: { no: string; title: string; items: Item[]; cells: boolean }) {
  return (
    <section>
      <div className="section-kicker">{no} {title}</div>
      {cells ? (
        <div className="measure-grid">
          {items.map(([k, v, m]) => (
            <div className={`measure-cell ${m ?? ''}`} key={k}><span>{k}<Tag mark={m} /></span><strong>{v}</strong></div>
          ))}
        </div>
      ) : (
        <div className="info-table">
          {items.map(([k, v, m]) => (
            <div className={`info-row ${m ?? ''}`} key={k}><span>{k}<Tag mark={m} /></span><strong>{v}</strong></div>
          ))}
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
  // 노랑: 사유 코드 → 재검 항목 (oil_warn → oil, crack_suspected → crack, tag_missing → tag ...)
  // 빨강: 빨강 사유 코드만 용해 사유 항목으로 표시
  const marked = new Set(
    scan.screening === 'YELLOW' ? scan.reason_codes.map((code) => code.split('_')[0])
    : scan.screening === 'RED' ? scan.reason_codes.map((code) => RED_CODE_KEY[code]).filter(Boolean)
    : [],
  );
  const markTone: Mark = scan.screening === 'RED' ? 'reject' : 'recheck';
  const r = (key: string): Mark => (marked.has(key) ? markTone : undefined);

  // 표시되는 항목만 01부터 차례로 번호 매김 (판정 전에는 측정값 항목이 빠짐)
  const groups: [title: string, items: Item[], show: boolean, cells?: boolean][] = [
    ['소재 상세 정보', [
      ...(hideSummary ? [] : [
        ['로트 번호', lot.lot_id, r('tag')],
        ['합금', lot.grade],
        ['열처리 상태', temper],
        ['질량', val(measure.kg, ' kg')],
        ['치수', dims ? `${dims.join(' × ')} mm` : '—'],
      ] satisfies Item[]),
      ['계산 밀도', rho == null ? '—' : `${rho.toFixed(2)} g/cm³`, r('density')],
      ['기준 밀도', rhoRef ? `${rhoRef.toFixed(2)} g/cm³` : '—'],
    ], true],
    ['화학적 특성', c ? [
      ['화학조성 적합 여부', c.chem ? join(c.chem, CHEM_DESC[c.chem]) : '—', r('chem')],
      ['이종금속', val(c.foreign, ' wt.%', 2), r('foreign')],
      ['오일 · 절삭유', val(c.oil, ' wt.%', 2), r('oil')],
      ['먼지', val(c.dust, ' wt.%', 2), r('dust')],
    ] : [], done && !!c, true],
    ['소재 결함 및 상태', c ? [
      ['산화', val(c.oxide, '%'), r('oxide')],
      ['부식', val(c.corr, '%'), r('corr')],
      ['코팅', val(c.coat, '%'), r('coat')],
      ['스크래치', val(c.scratch, '%'), r('scratch')],
      ['균열', c.crack ? CRACK_DESC[c.crack] : '—', r('crack')],
      ['변형률', val(c.deform, '%'), r('deform')],
    ] : [], done && !!c, true],
    ['AI 판정 근거', [
      ['판정 결과', scan.screening ? SCREENING_LABEL[scan.screening] : '—'],
      ['판정 기준', '빨강 트리거 → 노랑 트리거 (가드밴드 G − w 진입 등) → 둘 다 없으면 초록'],
      ['주요 판단 근거', scan.reason_codes.length
        ? scan.reason_codes.map(reasonLabel).join(', ')
        : '빨강·노랑 트리거 없음. 모든 측정 항목이 가드밴드 밖'],
      ...(scan.yellow_actions.length
        ? [['추가 확인 조치', scan.yellow_actions.map((a) => `${a.action} (${a.items.join(', ')})`).join('  /  ')] satisfies Item]
        : []),
      ['상태 점수 C (참고)', scan.condition_score != null ? `${scan.condition_score} / 100` : '산정 안 함 (빨강)'],
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
