// 번역 문구 모음. 새 문구는 en/ko 양쪽에 같은 키로 추가한다. (기본 언어: en)
export const messages = {
  en: {
    'step.analysis': 'Analysis',
    'step.scenario': 'Scenarios',
    'step.proposal': 'Proposal',
    'header.stepsLabel': 'Progress steps',
    'header.serverConnected': 'Server connected',
    'header.langToggle': 'Switch language',
  },
  ko: {
    'step.analysis': '분석 진행',
    'step.scenario': '시나리오',
    'step.proposal': '제안서',
    'header.stepsLabel': '진행 단계',
    'header.serverConnected': '서버 연결됨',
    'header.langToggle': '언어 전환',
  },
} as const;

export type Lang = keyof typeof messages;
export type MessageKey = keyof (typeof messages)['en'];
