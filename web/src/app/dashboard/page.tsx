'use client';

import { useEffect, useMemo, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { MarketOverview } from '@/components/MarketOverview';
import { NewsFeed } from '@/components/NewsFeed';
import { SentimentPanel } from '@/components/SentimentPanel';
import { EconomicCalendarPanel } from '@/components/EconomicCalendarPanel';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { MacroAnalysis } from '@/components/MacroAnalysis';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuthStore } from '@/store/auth';
import { isUp } from '@/lib/format';

function breathingCopy(cards: ReturnType<typeof useRealtime>['market']) {
  if (!cards || cards.length === 0) {
    return { title: 'listening', sub: 'Waiting on the first tick.' };
  }
  const up = cards.filter((c) => isUp(c.change)).length;
  const down = cards.length - up;
  if (up > down * 1.5) return { title: 'breathing', sub: 'Broad tape running warm — risk is on.' };
  if (down > up * 1.5) return { title: 'retreating', sub: 'Broad tape running cold — risk is off.' };
  return { title: 'mixed', sub: 'Winners and losers split — no clear read yet.' };
}

function formatClock(): string {
  const d = new Date();
  const day = d.toLocaleDateString('en-US', { weekday: 'short' });
  const date = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  // Prefix `Local` so a data-focused reader parses this as the reader's
  // wall clock, not the freshness of the tape.
  return `Local · ${day} ${date} · ${time}`;
}

export default function DashboardPage() {
  const { market, news, sentiment, connected } = useRealtime();
  const { status, loadSession } = useAuthStore();
  const authed = status === 'authenticated';

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const mood = useMemo(() => breathingCopy(market), [market]);

  const [stamp, setStamp] = useState<string>('');
  useEffect(() => {
    setStamp(formatClock());
    const id = setInterval(() => setStamp(formatClock()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen text-primary">
      <TopBar connected={connected} />

      <main className="mx-auto max-w-[1560px] space-y-4 px-4 py-4 md:px-6 md:py-6">
        <section className="flex flex-wrap items-baseline justify-between gap-4 pt-2">
          <h1 className="font-serif tracking-tight text-primary" style={{ fontSize: 'clamp(32px, 4vw, 48px)', lineHeight: 1 }}>
            The market is <em className="italic gradient-text">{mood.title}</em>.
          </h1>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
            <span suppressHydrationWarning>{stamp || '—'}</span>
            <span>
              <span className="text-primary">{market.length}</span> instruments
            </span>
            <span className="italic font-serif text-[12px] tracking-normal normal-case text-secondary">
              {mood.sub}
            </span>
          </div>
        </section>

        <MarketOverview cards={market} />

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          <div className="xl:col-span-2">
            <NewsFeed liveItems={news} />
          </div>
          <div className="space-y-4">
            <SentimentPanel data={sentiment} />
            <WatchlistPanel enabled={authed} />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <MacroAnalysis enabled={authed} />
          <EconomicCalendarPanel />
        </div>

        <footer className="py-8 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
          Yahoo · CNBC · Investing · FT · alternative.me · Trading Economics
          <span className="mx-3 text-faint">·</span>
          <em className="font-serif text-[12px] italic tracking-normal normal-case text-muted">
            Educational use only — not financial advice.
          </em>
        </footer>
      </main>
    </div>
  );
}
