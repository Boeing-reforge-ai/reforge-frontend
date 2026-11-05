import { useMemo, type ReactNode } from 'react';
import { LangContext } from './context';
import { messages, type MessageKey } from './messages';

// 영어 전용. 코드 곳곳의 tr(en, ko)는 항상 영어를 돌려준다. (한국어 문구는 다시 켤 때를 위해 남겨 둠)
export function LangProvider({ children }: { children: ReactNode }) {
  const value = useMemo(
    () => ({ lang: 'en' as const, t: (key: MessageKey) => messages.en[key], tr: (en: string) => en }),
    [],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}
