'use client';

import { Panel } from './Panel';
import { formatPercent, formatPrice } from '@/lib/format';
import type { SentimentSnapshot } from '@/types';

function gaugeLabelColor(value: number): string {
  if (value >= 75) return 'var(--color-up)';
  if (value >= 55) return 'var(--color-up)';
  if (value >= 45) return 'var(--color-amber)';
  if (value >= 25) return 'var(--color-amber)';
  return 'var(--color-down)';
}

function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = 78;
  const circumference = Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const labelColor = gaugeLabelColor(clamped);

  const angle = (clamped / 100) * Math.PI - Math.PI;
  const cx = 100 + Math.cos(angle) * radius;
  const cy = 100 + Math.sin(angle) * radius;

  return (
    <div className="relative w-full">
      <svg viewBox="0 0 200 120" className="block h-auto w-full max-w-[320px] mx-auto">
        <defs>
          <linearGradient id="gauge-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--color-down)" />
            <stop offset="0.5" stopColor="var(--color-amber)" />
            <stop offset="1" stopColor="var(--color-up)" />
          </linearGradient>
        </defs>
        <path
          d="M 22 100 A 78 78 0 0 1 178 100"
          fill="none"
          stroke="var(--color-gauge-track)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 22 100 A 78 78 0 0 1 178 100"
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.2,0.8,0.2,1)' }}
        />
        <circle
          cx={cx}
          cy={cy}
          r="5"
          fill={labelColor}
          style={{ filter: `drop-shadow(0 0 8px color-mix(in srgb, ${labelColor} 60%, transparent))` }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 top-[62%] -translate-y-1/2 text-center">
        <div
          className="font-serif italic tabular-nums text-primary"
          style={{ fontSize: 48, lineHeight: 1, letterSpacing: '-0.035em' }}
          aria-label={`Fear and Greed reads ${Math.round(clamped)} out of 100 — ${label}`}
        >
          {Math.round(clamped)}
        </div>
        <span
          className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em]"
          style={{ color: labelColor }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export function SentimentPanel({ data }: { data: SentimentSnapshot | null }) {
  const news = data?.newsSentiment;
  const totalNews = news ? news.bullish + news.bearish + news.neutral : 0;
  const bullPct = totalNews ? Math.round((news!.bullish / totalNews) * 100) : 0;
  const bearPct = totalNews ? Math.round((news!.bearish / totalNews) * 100) : 0;

  const vixTicker = data?.vix
    ? `VIX ${formatPrice(data.vix.value)} ${formatPercent(data.vix.changePercent)}`
    : undefined;

  return (
    <Panel
      title="Market Sentiment"
      subtitle={vixTicker ?? 'Fear & Greed · VIX · AI news tone'}
      variant="stat"
    >
      <div className="space-y-4">
        {data?.fearGreed ? (
          <FearGreedGauge value={data.fearGreed.value} label={data.fearGreed.label} />
        ) : (
          <div className="py-8 text-center text-sm text-muted">Loading sentiment…</div>
        )}

        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
          <div className="glass rounded-xl px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              VIX Volatility
            </div>
            <div className="mt-1 font-serif tabular-nums text-primary" style={{ fontSize: 26, lineHeight: 1.05 }}>
              {data?.vix ? formatPrice(data.vix.value) : '—'}
            </div>
            {data?.vix && (
              <div className={`mt-1 font-mono text-[11px] tabular-nums ${data.vix.changePercent >= 0 ? 'text-down' : 'text-up'}`}>
                {formatPercent(data.vix.changePercent)}
              </div>
            )}
          </div>
          <div className="glass rounded-xl px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
              AI News Tone
            </div>
            {totalNews > 0 ? (
              <>
                <div className="mt-1 font-serif tabular-nums text-primary" style={{ fontSize: 22, lineHeight: 1.1 }}>
                  <span className="text-up">{bullPct}</span>
                  <span className="text-faint">/</span>
                  <span className="text-down">{bearPct}</span>
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-muted">
                  bull · bear · {totalNews} analyzed
                </div>
              </>
            ) : (
              <div className="mt-1 text-[12px] text-muted italic font-serif">
                Analyze articles to populate
              </div>
            )}
          </div>
        </div>

        {totalNews > 0 && (
          <div className="flex h-1.5 overflow-hidden rounded-full bg-panel2">
            <div className="bg-up" style={{ width: `${bullPct}%` }} />
            <div style={{ width: `${100 - bullPct - bearPct}%`, background: 'var(--color-border)' }} />
            <div className="bg-down" style={{ width: `${bearPct}%` }} />
          </div>
        )}
      </div>
    </Panel>
  );
}
