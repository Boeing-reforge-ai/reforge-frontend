import { useState } from 'react';
import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { BrandLogo, SplashScreen } from '@/components/Brand';
import Icon from '@/components/Icon';
import { useLang } from '@/i18n/useLang';
import type { MessageKey } from '@/i18n/messages';

type Step = 1 | 2 | 3;

const STEPS: MessageKey[] = ['step.analysis', 'step.scenario', 'step.proposal'];

function stepOf(pathname: string): Step {
  if (pathname.startsWith('/proposals/')) return 3;
  if (pathname.endsWith('/scenarios')) return 2;
  return 1;
}

function Header({ step }: { step: Step }) {
  const { t } = useLang();
  return (
    <header className="app-header">
      <Link className="brand" to="/"><BrandLogo variant="header" /></Link>
      <nav className="stepper" aria-label={t('header.stepsLabel')}>
        {STEPS.map((key, index) => {
          const number = (index + 1) as Step;
          return (
            <div className="step-wrap" key={key}>
              {/* 진행 상태 표시만, 클릭으로 이동하지 않음 */}
              <div
                className={`step ${number === step ? 'active' : ''} ${number < step ? 'complete' : ''}`}
                aria-current={number === step ? 'step' : undefined}
              >
                <span className="step-num">{number < step ? <Icon name="check" className="size-3.5" /> : number}</span>
                <span>{t(key)}</span>
              </div>
              {index < STEPS.length - 1 && <span className="step-line" />}
            </div>
          );
        })}
      </nav>
      {/* TODO: GET /health 결과로 연결 상태 표시 */}
      <div className="header-right">
        <div className="server-status"><span className="status-dot" /> {t('header.serverConnected')}</div>
      </div>
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
      {/* 새 화면으로 이동하면 맨 위부터, 뒤로 가기는 이전 위치 복원 */}
      <ScrollRestoration />
    </div>
  );
}
