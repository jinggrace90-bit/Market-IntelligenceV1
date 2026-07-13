import crypto from 'crypto';
import Parser from 'rss-parser';
import axios from 'axios';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { NewsItem } from '../types';
import {
  RSS_FEEDS,
  IMPORTANCE_KEYWORDS,
  ASSET_DICTIONARY,
  FeedSource,
} from './newsSources';

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'MarketIntelligenceDashboard/1.0 (+rss)' },
});

function hashUrl(url: string): string {
  return crypto.createHash('sha1').update(url).digest('hex');
}

function stripHtml(input?: string): string {
  if (!input) return '';
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Heuristic 0-100 importance from keyword weight + recency. */
function scoreImportance(text: string, publishedAt: Date): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const [kw, weight] of Object.entries(IMPORTANCE_KEYWORDS)) {
    if (lower.includes(kw)) score += weight;
  }
  const ageHours = (Date.now() - publishedAt.getTime()) / 36e5;
  if (ageHours < 1) score += 15;
  else if (ageHours < 3) score += 10;
  else if (ageHours < 6) score += 5;
  return Math.min(100, score);
}

function extractAssets(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const [phrase, symbol] of Object.entries(ASSET_DICTIONARY)) {
    if (lower.includes(phrase)) found.add(symbol);
  }
  return [...found].slice(0, 6);
}

interface RawItem {
  title: string;
  url: string;
  source: string;
  category: string;
  country: string;
  summary: string;
  imageUrl: string | null;
  publishedAt: Date;
}

async function fetchFeed(feed: FeedSource): Promise<RawItem[]> {
  try {
    const parsed = await parser.parseURL(feed.url);
    return (parsed.items ?? [])
      .filter((i) => i.link && i.title)
      .map((i) => {
        const summary = stripHtml(i.contentSnippet ?? i.content ?? i.summary);
        const image =
          (i.enclosure?.url as string | undefined) ??
          (i as any)['media:content']?.$?.url ??
          null;
        return {
          title: i.title!.trim(),
          url: i.link!,
          source: feed.name,
          category: (i.categories?.[0] as string) ?? feed.category,
          country: feed.country,
          summary,
          imageUrl: image,
          publishedAt: i.isoDate ? new Date(i.isoDate) : new Date(),
        };
      });
  } catch (err) {
    logger.warn(`Feed failed: ${feed.name}`);
    return [];
  }
}

// Optional NewsAPI supplement (only when a key is configured).
async function fetchNewsApi(): Promise<RawItem[]> {
  if (!env.newsApiKey) return [];
  try {
    const { data } = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: { category: 'business', language: 'en', pageSize: 50 },
      headers: { 'X-Api-Key': env.newsApiKey },
      timeout: 8000,
    });
    return (data.articles ?? []).map((a: any) => ({
      title: a.title,
      url: a.url,
      source: a.source?.name ?? 'NewsAPI',
      category: 'business',
      country: 'US',
      summary: stripHtml(a.description),
      imageUrl: a.urlToImage ?? null,
      publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
    }));
  } catch {
    logger.warn('NewsAPI fetch failed');
    return [];
  }
}

/**
 * Fetches every source, scores + dedupes, and upserts into Postgres.
 * Returns the number of newly inserted articles.
 */
export async function ingestNews(): Promise<number> {
  const batches = await Promise.all([...RSS_FEEDS.map(fetchFeed), fetchNewsApi()]);
  const raw = batches.flat();

  // Dedupe by URL hash within this batch.
  const byId = new Map<string, RawItem>();
  for (const item of raw) {
    if (!item.title || !item.url) continue;
    byId.set(hashUrl(item.url), item);
  }

  let inserted = 0;
  for (const [externalId, item] of byId) {
    const text = `${item.title} ${item.summary}`;
    try {
      const result = await prisma.newsArticle.upsert({
        where: { externalId },
        create: {
          externalId,
          title: item.title,
          url: item.url,
          source: item.source,
          category: item.category,
          country: item.country,
          imageUrl: item.imageUrl,
          summary: item.summary || null,
          publishedAt: item.publishedAt,
          relatedAssets: extractAssets(text),
          importance: scoreImportance(text, item.publishedAt),
        },
        update: {}, // don't churn existing rows
      });
      if (result.createdAt.getTime() > Date.now() - 5000) inserted += 1;
    } catch {
      /* skip malformed row */
    }
  }

  logger.info(`News ingest: ${byId.size} items seen, ~${inserted} new`);
  return inserted;
}

export interface NewsQuery {
  cursor?: string; // article id
  limit?: number;
  category?: string;
  country?: string;
  search?: string;
  minImportance?: number;
}

function toItem(a: any): NewsItem {
  return {
    id: a.id,
    externalId: a.externalId,
    title: a.title,
    url: a.url,
    source: a.source,
    category: a.category,
    country: a.country,
    imageUrl: a.imageUrl,
    summary: a.summary,
    publishedAt: a.publishedAt.toISOString(),
    relatedAssets: a.relatedAssets,
    importance: a.importance,
  };
}

/** Cursor-paginated news feed for infinite scroll. */
export async function getNews(query: NewsQuery): Promise<{ items: NewsItem[]; nextCursor: string | null }> {
  const limit = Math.min(query.limit ?? 20, 50);
  const where: any = {};
  if (query.category) where.category = query.category;
  if (query.country) where.country = query.country;
  if (query.minImportance) where.importance = { gte: query.minImportance };
  if (query.search) {
    where.OR = [
      { title: { contains: query.search, mode: 'insensitive' } },
      { summary: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  const rows = await prisma.newsArticle.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });

  const hasMore = rows.length > limit;
  const page = hasMore ? rows.slice(0, limit) : rows;
  return {
    items: page.map(toItem),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

export async function getArticleById(id: string) {
  return prisma.newsArticle.findUnique({ where: { id } });
}
