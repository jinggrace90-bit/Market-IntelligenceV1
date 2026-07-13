'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { NewsItem } from '@/types';

export interface NewsFilters {
  search?: string;
  category?: string;
  minImportance?: number;
}

interface NewsPage {
  items: NewsItem[];
  nextCursor: string | null;
}

export function useNewsFeed(filters: NewsFilters) {
  return useInfiniteQuery<NewsPage>({
    queryKey: ['news', filters],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { data } = await api.get('/news', {
        params: {
          limit: 20,
          cursor: pageParam ?? undefined,
          search: filters.search || undefined,
          category: filters.category || undefined,
          minImportance: filters.minImportance || undefined,
        },
      });
      return data as NewsPage;
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}
