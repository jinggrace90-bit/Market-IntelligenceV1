'use client';

import { useState } from 'react';
import { AutoComplete, Button, Empty, Popconfirm, Spin, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Panel } from './Panel';
import { api, apiError } from '@/lib/api';
import { useWatchlist, useAddToWatchlist, useRemoveFromWatchlist } from '@/hooks/useWatchlist';
import { formatPrice, formatPercent, isUp } from '@/lib/format';

interface Option {
  value: string;
  label: string;
  symbol: string;
  name: string;
  type: string;
}

export function WatchlistPanel({ enabled }: { enabled: boolean }) {
  const { data: items = [], isLoading } = useWatchlist(enabled);
  const add = useAddToWatchlist();
  const remove = useRemoveFromWatchlist();
  const [options, setOptions] = useState<Option[]>([]);
  const [value, setValue] = useState('');

  const onSearch = async (q: string) => {
    if (q.length < 1) return setOptions([]);
    try {
      const { data } = await api.get('/search', { params: { q } });
      setOptions(
        (data.data.instruments ?? []).map((i: any) => ({
          value: i.symbol,
          symbol: i.symbol,
          name: i.name,
          type: i.type,
          label: `${i.symbol} · ${i.name}`,
        })),
      );
    } catch {
      setOptions([]);
    }
  };

  const onSelect = async (_v: string, option: Option) => {
    try {
      await add.mutateAsync({ symbol: option.symbol, name: option.name });
      setValue('');
      setOptions([]);
    } catch (e) {
      message.error(apiError(e));
    }
  };

  if (!enabled) {
    return (
      <Panel title="My Watchlist" subtitle="Track your instruments">
        <Empty description="Sign in to build a watchlist" />
      </Panel>
    );
  }

  return (
    <Panel title="My Watchlist" subtitle="Live prices · refreshes every 20s">
      <AutoComplete
        value={value}
        options={options}
        onSearch={onSearch}
        onChange={setValue}
        onSelect={onSelect as any}
        className="mb-3 w-full"
        placeholder="Add symbol (e.g. AAPL, BTC-USD)…"
        allowClear
      />

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spin />
        </div>
      ) : items.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-500">
          <PlusOutlined /> Search above to add your first instrument
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {items.map((item) => {
            const q = item.quote;
            const up = q ? isUp(q.change) : true;
            return (
              <div key={item.id} className="flex items-center justify-between py-2">
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-gray-100">{item.symbol}</div>
                  <div className="truncate text-[11px] text-gray-500">{item.name ?? q?.name}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono text-[13px] tabular-nums text-gray-100">
                      {q ? formatPrice(q.price) : '—'}
                    </div>
                    {q && (
                      <div className={`text-[11px] tabular-nums ${up ? 'text-up' : 'text-down'}`}>
                        {formatPercent(q.changePercent)}
                      </div>
                    )}
                  </div>
                  <Popconfirm title="Remove?" onConfirm={() => remove.mutate(item.id)}>
                    <Button size="small" type="text" icon={<DeleteOutlined />} danger />
                  </Popconfirm>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
