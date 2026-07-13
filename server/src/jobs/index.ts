import cron from 'node-cron';
import { ingestNews } from '../services/news';
import { getMarketOverview } from '../services/marketData';
import { getSentiment } from '../services/sentiment';
import { getEconomicCalendar } from '../services/economicCalendar';
import { logger } from '../utils/logger';

/** Schedules background refresh jobs and warms caches on boot. */
export function startJobs() {
  // News every 5 minutes.
  cron.schedule('*/5 * * * *', () => {
    ingestNews().catch((e) => logger.error('News job failed', e));
  });

  // Warm the market + sentiment + calendar caches every few minutes so the
  // first request of each is fast and WS snapshots are instant.
  cron.schedule('*/3 * * * *', () => {
    getMarketOverview().catch(() => {});
    getSentiment().catch(() => {});
  });

  cron.schedule('0 */6 * * *', () => {
    getEconomicCalendar().catch(() => {});
  });

  // Kick off an initial ingest + cache warm on startup (non-blocking).
  logger.info('Warming caches on boot…');
  ingestNews().catch((e) => logger.warn('Initial news ingest failed', e));
  getMarketOverview().catch(() => {});
  getEconomicCalendar().catch(() => {});
}
