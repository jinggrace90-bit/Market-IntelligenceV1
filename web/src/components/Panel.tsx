'use client';

import type { ReactNode } from 'react';

interface PanelProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, subtitle, action, children, className = '', bodyClassName = '' }: PanelProps) {
  return (
    <section className={`rounded-xl border border-border bg-panel ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-100">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[11px] text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </header>
      <div className={`overflow-x-auto p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
