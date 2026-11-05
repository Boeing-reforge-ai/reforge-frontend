import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LangContext } from './context';
import { messages, type Lang, type MessageKey } from './messages';

const STORAGE_KEY = 'reforge.lang';

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ko') return saved;
  } catch { /* 저장소 접근 불가 시 기본값 */ }
  return 'en';
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const value = useMemo(
    () => ({ lang, setLang, t: (key: MessageKey) => messages[lang][key], tr: (en: string, ko: string) => (lang === 'en' ? en : ko) }),
    [lang, setLang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
