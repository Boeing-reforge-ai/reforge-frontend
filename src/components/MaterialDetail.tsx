import { RHO_REF } from '@/lib/criteria';
import { useLang } from '@/i18n/useLang';
import type { Bi } from '@/i18n/pair';
import { SCREENING_LABEL, YS_SRC_LABEL, reasonLabel } from '@/lib/labels';
import type { ScanDetail } from '@/types/api';

const TEMPER_LABEL: Record<string, Bi> = {
  annealed: ['annealed', '풀림 처리'], T6: ['solution treated + artificially aged', '용체화 후 인공시효'], T651: ['solution treated, aged, stress relieved', '용체화·인공시효·응력 제거'],
};
const CHEM_DESC: Record<string, Bi> = { IN: ['within alloy spec range', '허용 합금 규격 범위 내'], BORDER: ['at spec boundary', '허용 규격 경계'], OUT: ['outside alloy spec', '허용 규격 이탈'] };
const CRACK_DESC: Record<string, Bi> = { none: ['None', '없음'], suspected: ['Suspected', '의심'], confirmed: ['Confirmed', '확정'] };

const val = (v: number | null | undefined, unit: string, digits?: number) =>
  v == null ? '—' : `${digits != null ? v.toFixed(digits) : v}${unit}`;
const join = (...parts: string[]) => parts.join('  ·  ');

// 항목 표시: recheck = 노랑 재검 대상, reject = 빨강 용해 사유
type Mark = 'recheck' | 'reject' | undefined;
type Item = [label: string, value: string, mark?: Mark];

const MARK_TAG: Record<'recheck' | 'reject', Bi> = { recheck: ['Recheck', '재검'], reject: ['Reason to remelt', '용해 사유'] };
const Tag = ({ mark }: { mark: Mark }) => {
  const { tr } = useLang();
  return mark ? <em className={`mark-tag ${mark}`}>{tr(...MARK_TAG[mark])}</em> : null;
};

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
  const { tr } = useLang();
  const { lot, measure, condition: c } = scan;
  const done = scan.status === 'done';
  const dims = measure.dim_mm;
  const rhoRef = RHO_REF[lot.grade];
  // 계산 밀도 = 질량 ÷ 외곽 치수 부피 (서버 판정과 같은 식)
  const rho = dims && measure.kg ? (measure.kg * 1000) / ((dims[0] * dims[1] * dims[2]) / 1000) : null;
  const temper = lot.temper
    ? `${lot.temper[0].toUpperCase()}${lot.temper.slice(1)}${TEMPER_LABEL[lot.temper] ? ` (${tr(...TEMPER_LABEL[lot.temper])})` : ''}`
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
    [tr('Material details', '소재 상세 정보'), [
      ...(hideSummary ? [] : [
        [tr('Lot no.', '로트 번호'), lot.lot_id, r('tag')],
        [tr('Alloy', '합금'), lot.grade],
        [tr('Temper', '열처리 상태'), temper],
        [tr('Mass', '질량'), val(measure.kg, ' kg')],
        [tr('Dimensions', '치수'), dims ? `${dims.join(' × ')} mm` : '—'],
      ] satisfies Item[]),
      [tr('Calculated density', '계산 밀도'), rho == null ? '—' : `${rho.toFixed(2)} g/cm³`, r('density')],
      [tr('Reference density', '기준 밀도'), rhoRef ? `${rhoRef.toFixed(2)} g/cm³` : '—'],
    ], true],
    [tr('Chemical properties', '화학적 특성'), c ? [
      [tr('Composition conformity', '화학조성 적합 여부'), c.chem ? join(c.chem, tr(...CHEM_DESC[c.chem])) : '—', r('chem')],
      [tr('Foreign metal', '이종금속'), val(c.foreign, ' wt.%', 2), r('foreign')],
      [tr('Oil / coolant', '오일 · 절삭유'), val(c.oil, ' wt.%', 2), r('oil')],
      [tr('Dust', '먼지'), val(c.dust, ' wt.%', 2), r('dust')],
    ] : [], done && !!c, true],
    [tr('Defects & condition', '소재 결함 및 상태'), c ? [
      [tr('Oxidation', '산화'), val(c.oxide, '%'), r('oxide')],
      [tr('Corrosion', '부식'), val(c.corr, '%'), r('corr')],
      [tr('Coating', '코팅'), val(c.coat, '%'), r('coat')],
      [tr('Scratches', '스크래치'), val(c.scratch, '%'), r('scratch')],
      [tr('Cracks', '균열'), c.crack ? tr(...CRACK_DESC[c.crack]) : '—', r('crack')],
      [tr('Deformation', '변형률'), val(c.deform, '%'), r('deform')],
    ] : [], done && !!c, true],
    [tr('AI assessment basis', 'AI 판정 근거'), [
      [tr('Assessment', '판정 결과'), scan.screening ? tr(...SCREENING_LABEL[scan.screening]) : '—'],
      [tr('Criteria', '판정 기준'), tr('Red trigger → yellow trigger (e.g. entering guard band G − w) → green if neither', '빨강 트리거 → 노랑 트리거 (가드밴드 G − w 진입 등) → 둘 다 없으면 초록')],
      [tr('Key reasons', '주요 판단 근거'), scan.reason_codes.length
        ? scan.reason_codes.map((code) => reasonLabel(code, tr)).join(', ')
        : tr('No red/yellow triggers. All measurements are outside the guard band.', '빨강·노랑 트리거 없음. 모든 측정 항목이 가드밴드 밖')],
      ...(scan.yellow_actions.length
        ? [[tr('Additional check actions', '추가 확인 조치'), scan.yellow_actions.map((a) => `${a.action} (${a.items.join(', ')})`).join('  /  ')] satisfies Item]
        : []),
      [tr('Condition score C (ref.)', '상태 점수 C (참고)'), scan.condition_score != null ? `${scan.condition_score} / 100` : tr('Not calculated (red)', '산정 안 함 (빨강)')],
    ], withJudgment && done],
    [tr('Data reliability', '데이터 신뢰성'), [
      [tr('Certificate on file', '성적서 보유 여부'), lot.cert ? tr('Yes', '보유') : tr('No', '미보유')],
      [tr('Property data source', '물성 데이터 출처'), lot.ys_src ? join(tr(`Grade ${lot.ys_src}`, `${lot.ys_src} 등급`), tr(`Yield strength from ${tr(...YS_SRC_LABEL[lot.ys_src])}`, `${tr(...YS_SRC_LABEL[lot.ys_src])} 기반 항복강도 데이터`)) : tr('No strength value (using material typical value)', '강도값 없음 (소재 대표값 사용)')],
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
