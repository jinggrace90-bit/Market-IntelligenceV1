import { prisma } from '../lib/prisma';
import { getQuotes } from './marketData';
import { notFound } from '../utils/http';

export async function getWatchlist(userId: string) {
  const items = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { position: 'asc' },
  });
  if (items.length === 0) return [];

  const quotes = await getQuotes(items.map((i) => i.symbol));
  const quoteBySymbol = new Map(quotes.map((q) => [q.symbol, q]));

  return items.map((i) => ({
    id: i.id,
    symbol: i.symbol,
    name: i.name,
    assetType: i.assetType,
    position: i.position,
    quote: quoteBySymbol.get(i.symbol) ?? null,
  }));
}

export async function addToWatchlist(
  userId: string,
  symbol: string,
  name?: string,
  assetType?: string,
) {
  const upper = symbol.toUpperCase();
  const count = await prisma.watchlistItem.count({ where: { userId } });
  return prisma.watchlistItem.upsert({
    where: { userId_symbol: { userId, symbol: upper } },
    create: {
      userId,
      symbol: upper,
      name: name ?? null,
      assetType: assetType ?? 'stock',
      position: count,
    },
    update: { name: name ?? undefined, assetType: assetType ?? undefined },
  });
}

export async function removeFromWatchlist(userId: string, id: string) {
  const item = await prisma.watchlistItem.findFirst({ where: { id, userId } });
  if (!item) throw notFound('Watchlist item not found');
  await prisma.watchlistItem.delete({ where: { id } });
}

/** Persist a new ordering. `orderedIds` is the full list in display order. */
export async function reorderWatchlist(userId: string, orderedIds: string[]) {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.watchlistItem.updateMany({
        where: { id, userId },
        data: { position: index },
      }),
    ),
  );
}
