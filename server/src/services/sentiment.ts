import axios from 'axios';
import { cached } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { getQuotes } from './marketData';
import { SentimentSnapshot } from '../types';
import { logger } from '../utils/logger';

// alternative.me publishes a free, no-key Fear & Greed Index (crypto-wide,
// widely used as a market-risk proxy).
async function getFearGreed(): Promise<SentimentSnapshot['fearGreed']> {
  return cached('sentiment:feargreed', 60 * 30, async () => {
    try {
      const { data } = await axios.get('https://api.alternative.me/fng/', {
        params: { limit: 1 },
        timeout: 8000,
      });
      const point = data?.data?.[0];
      if (!point) return null;
      return {
        value: Number(point.value),
        label: point.value_classification,
        updatedAt: new Date(Number(point.timestamp) * 1000).toISOString(),
      };
    } catch {
      logger.warn('Fear & Greed fetch failed');
      return null;
    }
  });
}

async function getVix(): Promise<SentimentSnapshot['vix']> {
  try {
    const [vix] = await getQuotes(['^VIX']);
    if (!vix) return null;
    return { value: vix.price, changePercent: vix.changePercent };
  } catch {
    return null;
  }
}

// Bullish/bearish/neutral ratio derived from cached AI analyses over the last 3 days.
async function getNewsSentiment(): Promise<SentimentSnapshot['newsSentiment']> {
  try {
    const since = new Date(Date.now() - 1000 * 60 * 60 * 72);
    const grouped = await prisma.newsAnalysis.groupBy({
      by: ['sentiment'],
      where: { createdAt: { gte: since } },
      _count: { sentiment: true },
    });
    if (grouped.length === 0) return null;
    const out = { bullish: 0, bearish: 0, neutral: 0 };
    for (const g of grouped) {
      if (g.sentiment in out) out[g.sentiment as keyof typeof out] = g._count.sentiment;
    }
    return out;
  } catch {
    return null;
  }
}

export async function getSentiment(): Promise<SentimentSnapshot> {
  const [fearGreed, vix, newsSentiment] = await Promise.all([
    getFearGreed(),
    getVix(),
    getNewsSentiment(),
  ]);
  return { fearGreed, vix, newsSentiment, updatedAt: new Date().toISOString() };
}
