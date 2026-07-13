import yahooFinance from 'yahoo-finance2';
import { cached } from '../lib/redis';
import { MARKET_SYMBOLS, MARKET_SYMBOL_LIST } from '../config/symbols';
import { MarketCard, Quote, SparklinePoint } from '../types';
import { logger } from '../utils/logger';

// yahoo-finance2 emits interactive notices we don't want in server logs.
yahooFinance.suppressNotices(['yahooSurvey', 'ripHistorical']);

const NAME_BY_SYMBOL = new Map(MARKET_SYMBOLS.map((s) => [s.symbol, s]));

function toQuote(raw: any): Quote {
  const meta = NAME_BY_SYMBOL.get(raw.symbol);
  const price = raw.regularMarketPrice ?? raw.postMarketPrice ?? raw.preMarketPrice ?? 0;
  const prev = raw.regularMarketPreviousClose ?? price;
  const change = raw.regularMarketChange ?? price - prev;
  const changePercent = raw.regularMarketChangePercent ?? (prev ? (change / prev) * 100 : 0);
  return {
    symbol: raw.symbol,
    name: meta?.name ?? raw.shortName ?? raw.longName ?? raw.symbol,
    group: meta?.group,
    price,
    change,
    changePercent,
    previousClose: prev,
    currency: raw.currency,
    marketState: raw.marketState,
    updatedAt: new Date().toISOString(),
  };
}

/** Live quotes for arbitrary symbols. Cached 15s to stay under rate limits. */
export async function getQuotes(symbols: string[]): Promise<Quote[]> {
  if (symbols.length === 0) return [];
  const key = `quotes:${symbols.slice().sort().join(',')}`;
  return cached(key, 15, async () => {
    const results = await yahooFinance.quote(symbols);
    const list = Array.isArray(results) ? results : [results];
    return list.map(toQuote);
  });
}

/** Intraday sparkline for a symbol (1-day window, 5-minute candles). */
export async function getSparkline(symbol: string): Promise<SparklinePoint[]> {
  const key = `spark:${symbol}`;
  return cached(key, 60, async () => {
    try {
      const period1 = new Date(Date.now() - 1000 * 60 * 60 * 24 * 2); // 2 days back
      const chart = await yahooFinance.chart(symbol, { period1, interval: '15m' });
      return (chart.quotes ?? [])
        .filter((q) => q.close != null)
        .map((q) => ({ t: new Date(q.date).getTime(), c: q.close as number }));
    } catch (err) {
      logger.warn(`Sparkline failed for ${symbol}`);
      return [];
    }
  });
}

/** Full market-overview payload: quote + sparkline for every tracked symbol.
 *  Resilient by design: if the upstream provider throttles/fails, returns an
 *  empty array so the dashboard degrades gracefully instead of erroring. */
export async function getMarketOverview(): Promise<MarketCard[]> {
  let quotes: Quote[];
  try {
    quotes = await getQuotes(MARKET_SYMBOL_LIST);
  } catch (err) {
    logger.warn('Market overview quotes failed (provider throttled?) — returning empty set');
    return [];
  }
  const cards = await Promise.all(
    quotes.map(async (q) => ({ ...q, spark: await getSparkline(q.symbol) })),
  );
  // Preserve the configured display order.
  return MARKET_SYMBOL_LIST.map((s) => cards.find((c) => c.symbol === s)).filter(
    (c): c is MarketCard => Boolean(c),
  );
}
