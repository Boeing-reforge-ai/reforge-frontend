import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LangContext } from './context';
import { messages, type Lang, type MessageKey } from './messages';

const STORAGE_KEY = 'reforge.lang';

function initialLang(): Lang {
  let lang: Lang = 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'ko') lang = saved;
  } catch { /* 저장소 접근 불가 시 기본값 */ }
  // 하위 컴포넌트의 첫 API 요청(Accept-Language)보다 먼저 반영되도록 동기로 설정
  document.documentElement.lang = lang;
  return lang;
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
