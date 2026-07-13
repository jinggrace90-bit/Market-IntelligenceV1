import yahooFinance from 'yahoo-finance2';
import { cached } from '../lib/redis';
import { prisma } from '../lib/prisma';
import { NewsItem } from '../types';

yahooFinance.suppressNotices(['yahooSurvey']);

export interface SearchResults {
  instruments: {
    symbol: string;
    name: string;
    type: string;
    exchange: string | null;
  }[];
  news: NewsItem[];
}

/** Global search across instruments (Yahoo) and cached news (Postgres). */
export async function globalSearch(query: string): Promise<SearchResults> {
  const q = query.trim();
  if (q.length < 1) return { instruments: [], news: [] };

  const [instruments, news] = await Promise.all([
    cached(`search:instruments:${q.toLowerCase()}`, 60 * 10, async () => {
      const res = await yahooFinance.search(q, { quotesCount: 8, newsCount: 0 });
      return (res.quotes ?? [])
        .filter((r: any) => r.symbol)
        .map((r: any) => ({
          symbol: r.symbol,
          name: r.shortname ?? r.longname ?? r.symbol,
          type: r.quoteType ?? r.typeDisp ?? 'EQUITY',
          exchange: r.exchange ?? null,
        }));
    }),
    prisma.newsArticle
      .findMany({
        where: {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
          ],
        },
        orderBy: { publishedAt: 'desc' },
        take: 8,
      })
      .then((rows) =>
        rows.map((a) => ({
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
        })),
      ),
  ]);

  return { instruments, news };
}
