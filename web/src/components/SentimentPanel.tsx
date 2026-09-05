'use client';

import { Panel } from './Panel';
import { formatPercent, formatPrice } from '@/lib/format';
import type { SentimentSnapshot } from '@/types';

function gaugeColor(value: number): string {
  if (value >= 75) return '#16c784';
  if (value >= 55) return '#8fce00';
  if (value >= 45) return '#f0b90b';
  if (value >= 25) return '#ff8c42';
  return '#ea3943';
}

function FearGreedGauge({ value, label }: { value: number; label: string }) {
  const radius = 70;
  const circumference = Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const dash = (clamped / 100) * circumference;
  const color = gaugeColor(clamped);

  return (
    <div className="flex flex-col items-center">
      <svg width="180" height="104" viewBox="0 0 180 104">
        <path
          d="M 20 96 A 70 70 0 0 1 160 96"
          fill="none"
          stroke="var(--color-gauge-track)"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 20 96 A 70 70 0 0 1 160 96"
          fill="none"
          stroke={color}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x="90" y="82" textAnchor="middle" fill="var(--color-gauge-text)" fontSize="30" fontWeight="700">
          {Math.round(clamped)}
        </text>
      </svg>
      <div className="text-sm font-semibold" style={{ color }}>
        {label}
      </div>
      <div className="text-[11px] text-muted">Fear &amp; Greed Index</div>
    </div>
  );
}

export function SentimentPanel({ data }: { data: SentimentSnapshot | null }) {
  const news = data?.newsSentiment;
  const totalNews = news ? news.bullish + news.bearish + news.neutral : 0;
  const bullPct = totalNews ? Math.round((news!.bullish / totalNews) * 100) : 0;
  const bearPct = totalNews ? Math.round((news!.bearish / totalNews) * 100) : 0;

  return (
    <Panel title="Market Sentiment" subtitle="Fear &amp; Greed · VIX · AI news tone">
      <div className="space-y-4">
        {data?.fearGreed ? (
          <FearGreedGauge value={data.fearGreed.value} label={data.fearGreed.label} />
        ) : (
          <div className="py-6 text-center text-sm text-muted">Loading sentiment…</div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-panel2 p-3">
            <div className="text-[11px] uppercase text-muted">VIX (Volatility)</div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-primary">
              {data?.vix ? formatPrice(data.vix.value) : '—'}
            </div>
            {data?.vix && (
              <div className={`text-[12px] ${data.vix.changePercent >= 0 ? 'text-down' : 'text-up'}`}>
                {formatPercent(data.vix.changePercent)}
              </div>
            )}
          </div>
          <div className="rounded-lg border border-border bg-panel2 p-3">
            <div className="text-[11px] uppercase text-muted">AI News Tone</div>
            {totalNews > 0 ? (
              <>
                <div className="mt-1 text-lg font-semibold text-primary">
                  <span className="text-up">{bullPct}%</span>
                  <span className="mx-1 text-faint">/</span>
                  <span className="text-down">{bearPct}%</span>
                </div>
                <div className="text-[11px] text-muted">bull / bear ({totalNews} analyzed)</div>
              </>
            ) : (
              <div className="mt-1 text-[12px] text-muted">Analyze articles to populate</div>
            )}
          </div>
        </div>

        {totalNews > 0 && (
          <div className="flex h-2 overflow-hidden rounded-full bg-panel2">
            <div className="bg-up" style={{ width: `${bullPct}%` }} />
            <div className="bg-faint" style={{ width: `${100 - bullPct - bearPct}%` }} />
            <div className="bg-down" style={{ width: `${bearPct}%` }} />
          </div>
        )}
      </div>
    </Panel>
  );
}
