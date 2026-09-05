'use client';

import type { ReactNode } from 'react';

type PanelVariant = 'stream' | 'stat' | 'analysis';

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  variant?: PanelVariant;
  className?: string;
  bodyClassName?: string;
}

const shells: Record<PanelVariant, string> = {
  stream: 'rounded-xl border border-border bg-panel',
  stat: 'rounded-xl bg-panel2/60',
  analysis: 'rounded-xl border border-border bg-panel',
};

const headers: Record<PanelVariant, string> = {
  stream: 'flex items-center justify-between gap-3 border-b border-border px-4 py-3',
  stat: 'flex items-center justify-between gap-3 px-4 pt-4 pb-1',
  analysis:
    'flex items-center justify-between gap-3 px-5 pt-4 pb-2',
};

const bodies: Record<PanelVariant, string> = {
  stream: 'overflow-x-auto p-4',
  stat: 'p-4 pt-2',
  analysis: 'px-5 pb-5 pt-1 text-[13px] leading-relaxed',
};

const titleClasses: Record<PanelVariant, string> = {
  stream: 'text-sm font-semibold text-primary',
  stat: 'text-[11px] font-semibold uppercase tracking-[0.12em] text-muted',
  analysis: 'text-sm font-semibold text-primary',
};

export function Panel({
  title,
  subtitle,
  action,
  children,
  variant = 'stream',
  className = '',
  bodyClassName = '',
}: PanelProps) {
  return (
    <section className={`${shells[variant]} ${className}`}>
      <header className={headers[variant]}>
        <div>
          <h2 className={titleClasses[variant]}>{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-muted">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={`${bodies[variant]} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
