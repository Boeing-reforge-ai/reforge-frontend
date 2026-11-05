import { createContext } from 'react';
import type { Lang, MessageKey } from './messages';

export type LangContextValue = {
  lang: Lang;
  t: (key: MessageKey) => string;
  /** 인라인 번역: tr('English', '한국어'). 영어 전용이라 영어를 돌려준다 */
  tr: (en: string, ko: string) => string;
};

export const LangContext = createContext<LangContextValue | null>(null);
