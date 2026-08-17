'use client';

import { useEffect } from 'react';
import { TopBar } from '@/components/TopBar';
import { MarketOverview } from '@/components/MarketOverview';
import { NewsFeed } from '@/components/NewsFeed';
import { SentimentPanel } from '@/components/SentimentPanel';
import { EconomicCalendarPanel } from '@/components/EconomicCalendarPanel';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { MacroAnalysis } from '@/components/MacroAnalysis';
import { useRealtime } from '@/hooks/useRealtime';
import { useAuthStore } from '@/store/auth';

export default function DashboardPage() {
  const { market, news, sentiment, connected } = useRealtime();
  const { status, loadSession } = useAuthStore();
  const authed = status === 'authenticated';

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  return (
    <div className="min-h-screen bg-bg">
      <TopBar connected={connected} />

      <main className="mx-auto max-w-[1600px] space-y-4 p-4 md:p-6">
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

        <footer className="py-6 text-center text-[11px] text-gray-600">
          Data: Yahoo Finance, financial RSS feeds, alternative.me, Trading Economics · AI-powered analysis.
          Educational use only — not financial advice.
        </footer>
      </main>
    </div>
  );
}
