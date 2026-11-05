import { createContext } from 'react';
import type { Lang, MessageKey } from './messages';

export type LangContextValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey) => string;
  /** 인라인 번역: tr('English', '한국어') */
  tr: (en: string, ko: string) => string;
};

export const LangContext = createContext<LangContextValue | null>(null);
