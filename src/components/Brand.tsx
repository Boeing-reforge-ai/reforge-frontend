import Icon from '@/components/Icon';
import { useLang } from '@/i18n/useLang';

export function BrandLogo({ variant }: { variant: 'header' | 'splash' | 'document' }) {
  return (
    <span className={`brand-image ${variant}`}>
      <img src="/assets/reforge-nasaro-logo-horizontal.png" alt="Reforge AI Nasaro" />
    </span>
  );
}

export function AiBadge() {
  const { tr } = useLang();
  return <span className="ai-badge"><Icon name="spark" className="size-3" /> {tr('AI generated', 'AI 생성')}</span>;
}

export function SplashScreen({ onEnter }: { onEnter: () => void }) {
  const { tr } = useLang();
  return (
    <button type="button" className="splash-screen" onClick={onEnter} aria-label={tr('Start Reforge AI', 'Reforge AI 시작하기')}>
      <div className="splash-brand"><BrandLogo variant="splash" /><h1 className="mt-6 text-lg font-normal tracking-widest text-white/40">click to start scanning</h1></div>
    </button>
  );
}
