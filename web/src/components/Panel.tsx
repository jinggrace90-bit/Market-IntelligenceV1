'use client';

import type { ReactNode } from 'react';

type PanelVariant = 'stream' | 'stat' | 'analysis';

interface PanelProps {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  variant?: PanelVariant;
  className?: string;
  bodyClassName?: string;
}

const shells: Record<PanelVariant, string> = {
  stream: 'glass rounded-2xl',
  stat: 'glass rounded-2xl',
  analysis: 'glass rounded-2xl',
};

const headers: Record<PanelVariant, string> = {
  stream: 'flex items-baseline justify-between gap-4 px-5 pt-5 pb-4 border-b border-border',
  stat: 'flex items-baseline justify-between gap-4 px-5 pt-5 pb-3',
  analysis: 'flex items-baseline justify-between gap-4 px-6 pt-6 pb-3',
};

const bodies: Record<PanelVariant, string> = {
  stream: 'px-5 pb-5 pt-4',
  stat: 'px-5 pb-5',
  analysis: 'px-6 pb-6 pt-1 text-[13px] leading-relaxed',
};

const titleClasses: Record<PanelVariant, string> = {
  stream: 'font-serif text-[22px] leading-tight tracking-tight text-primary',
  stat: 'text-[10px] font-semibold uppercase tracking-[0.18em] text-muted flex items-center gap-2',
  analysis: 'font-serif text-[22px] leading-tight tracking-tight text-primary',
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
  const isStat = variant === 'stat';
  return (
    <section className={`${shells[variant]} ${className}`}>
      <header className={headers[variant]}>
        <div className="min-w-0">
          <h2 className={titleClasses[variant]}>
            {isStat && (
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{
                  background: 'var(--color-amber)',
                  boxShadow: '0 0 8px color-mix(in srgb, var(--color-amber) 60%, transparent)',
                }}
              />
            )}
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-muted font-medium">
              {subtitle}
            </p>
          )}
        </div>
        {action}
      </header>
      <div className={`${bodies[variant]} ${bodyClassName}`}>{children}</div>
    </section>
  );
}
