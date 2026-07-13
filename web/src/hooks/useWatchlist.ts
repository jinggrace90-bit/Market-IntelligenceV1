'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { WatchlistEntry } from '@/types';

const KEY = ['watchlist'];

export function useWatchlist(enabled: boolean) {
  return useQuery<WatchlistEntry[]>({
    queryKey: KEY,
    enabled,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data } = await api.get('/watchlist');
      return data.data as WatchlistEntry[];
    },
  });
}

export function useAddToWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { symbol: string; name?: string; assetType?: string }) => {
      const { data } = await api.post('/watchlist', payload);
      return data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRemoveFromWatchlist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/watchlist/${id}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
