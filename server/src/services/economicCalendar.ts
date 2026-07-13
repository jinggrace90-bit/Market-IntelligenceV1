import axios from 'axios';
import { cached } from '../lib/redis';
import { env } from '../config/env';
import { EconomicEvent } from '../types';
import { logger } from '../utils/logger';

function impactToImportance(impact: unknown): EconomicEvent['importance'] {
  const s = String(impact).toLowerCase();
  if (s.includes('high') || s === '3') return 'high';
  if (s.includes('medium') || s === '2') return 'medium';
  return 'low';
}

// ForexFactory currency codes → readable country/region labels.
const CURRENCY_LABEL: Record<string, string> = {
  USD: 'United States', EUR: 'Euro Area', GBP: 'United Kingdom', JPY: 'Japan',
  CNY: 'China', AUD: 'Australia', CAD: 'Canada', CHF: 'Switzerland',
  NZD: 'New Zealand',
};

// ForexFactory weekly calendar, mirrored as free no-key JSON by faireconomy.
// Real forward-looking macro calendar: releases, forecasts, previous values.
async function fetchForexFactory(): Promise<EconomicEvent[]> {
  try {
    const { data } = await axios.get('https://nfs.faireconomy.media/ff_calendar_thisweek.json', {
      headers: { 'User-Agent': 'Mozilla/5.0 MarketIntelligenceDashboard/1.0' },
      timeout: 9000,
    });
    if (!Array.isArray(data)) return [];
    return data.map((e: any, idx: number) => ({
      id: `ff-${e.date ?? idx}-${idx}`,
      date: e.date,
      country: CURRENCY_LABEL[e.country] ?? e.country ?? 'Global',
      event: e.title ?? 'Economic event',
      importance: impactToImportance(e.impact),
      previous: e.previous ? String(e.previous) : null,
      forecast: e.forecast ? String(e.forecast) : null,
      actual: e.actual ? String(e.actual) : null,
    }));
  } catch {
    logger.warn('ForexFactory calendar failed');
    return [];
  }
}

// Optional Finnhub economic calendar (requires a key with calendar access).
async function fetchFinnhub(): Promise<EconomicEvent[]> {
  if (!env.finnhubApiKey) return [];
  try {
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString().slice(0, 10);
    const { data } = await axios.get('https://finnhub.io/api/v1/calendar/economic', {
      params: { from, to, token: env.finnhubApiKey },
      timeout: 9000,
    });
    const events = data?.economicCalendar ?? [];
    return events.map((e: any, idx: number) => ({
      id: `fh-${e.time ?? idx}-${idx}`,
      date: e.time,
      country: e.country ?? 'Unknown',
      event: e.event ?? 'Economic event',
      importance: impactToImportance(e.impact),
      previous: e.prev != null ? String(e.prev) : null,
      forecast: e.estimate != null ? String(e.estimate) : null,
      actual: e.actual != null ? String(e.actual) : null,
    }));
  } catch {
    logger.warn('Finnhub calendar failed');
    return [];
  }
}

export async function getEconomicCalendar(): Promise<EconomicEvent[]> {
  return cached('calendar:economic', 60 * 60, async () => {
    const [finnhub, ff] = await Promise.all([fetchFinnhub(), fetchForexFactory()]);
    const merged = finnhub.length > 0 ? finnhub : ff;
    return merged
      .filter((e) => e.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  });
}
