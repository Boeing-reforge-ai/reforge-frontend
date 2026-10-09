import type { ReactNode } from 'react';

export type IconName =
  | 'scan' | 'spark' | 'file' | 'check' | 'x' | 'arrow' | 'edit'
  | 'print' | 'download' | 'refresh' | 'chevron' | 'compare' | 'box';

const paths: Record<IconName, ReactNode> = {
  scan: <><path d="M3 8V5a2 2 0 0 1 2-2h3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /><path d="M7 12h10M12 7v10" /></>,
  spark: <><path d="m12 3-1.4 3.6L7 8l3.6 1.4L12 13l1.4-3.6L17 8l-3.6-1.4L12 3Z" /><path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8L5 14ZM19 13l-.7 1.8-1.8.7 1.8.7L19 18l.7-1.8 1.8-.7-1.8-.7L19 13Z" /></>,
  file: <><path d="M6 2h8l4 4v16H6z" /><path d="M14 2v5h5M9 13h6M9 17h6" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  x: <path d="m6 6 12 12M18 6 6 18" />,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  edit: <path d="m14 5 5 5M4 20l4.5-1 10-10a2 2 0 0 0-5-5l-10 10L3 21z" />,
  print: <><path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><path d="M6 14h12v8H6z" /></>,
  download: <path d="M12 3v12m-4-4 4 4 4-4M4 20h16" />,
  refresh: <><path d="M20 7h-6V1" /><path d="M20 7a9 9 0 1 0 1 9" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  compare: <path d="M8 4H4v16h4M16 4h4v16h-4M12 2v20" />,
  box: <><path d="m3 7 9-5 9 5-9 5z" /><path d="m3 7 9 5v10l-9-5zM21 7l-9 5v10l9-5z" /></>,
};

export default function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
