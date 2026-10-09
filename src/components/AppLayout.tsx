import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { BrandLogo, SplashScreen } from '@/components/Brand';
import Icon from '@/components/Icon';

type Step = 1 | 2 | 3;

const STEPS: { label: string; path: string }[] = [
  { label: '분석 진행', path: '/' },
  // TODO: API 연결 후 현재 스캔·제안서 ID로 교체
  { label: '시나리오', path: '/scans/1/scenarios' },
  { label: '제안서', path: '/proposals/1' },
];

function stepOf(pathname: string): Step {
  if (pathname.startsWith('/proposals/')) return 3;
  if (pathname.endsWith('/scenarios')) return 2;
  return 1;
}

function Header({ step }: { step: Step }) {
  return (
    <header className="app-header">
      <Link className="brand" to="/"><BrandLogo variant="header" /></Link>
      <nav className="stepper" aria-label="진행 단계">
        {STEPS.map(({ label, path }, index) => {
          const number = (index + 1) as Step;
          return (
            <div className="step-wrap" key={label}>
              <Link
                to={path}
                className={`step ${number === step ? 'active' : ''} ${number < step ? 'complete' : ''}`}
                aria-current={number === step ? 'step' : undefined}
              >
                <span className="step-num">{number < step ? <Icon name="check" className="size-3.5" /> : number}</span>
                <span>{label}</span>
              </Link>
              {index < STEPS.length - 1 && <span className="step-line" />}
            </div>
          );
        })}
      </nav>
      {/* TODO: GET /health 결과로 연결 상태 표시 */}
      <div className="server-status"><span className="status-dot" /> 서버 연결됨</div>
    </header>
  );
}

export default function AppLayout() {
  const { pathname } = useLocation();
  // 첫 진입이 메인 화면일 때만 스플래시 표시, 화면을 클릭하면 시작
  const [showSplash, setShowSplash] = useState(() => window.location.pathname === '/');

  if (showSplash) return <SplashScreen onEnter={() => setShowSplash(false)} />;
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Header step={stepOf(pathname)} />
      <Outlet />
    </div>
  );
}
