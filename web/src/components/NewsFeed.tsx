'use client';

import { useMemo, useState } from 'react';
import { Input, Select, Button, Tag, Empty, Spin } from 'antd';
import { SearchOutlined, ThunderboltOutlined, LinkOutlined } from '@ant-design/icons';
import { Panel } from './Panel';
import { AiAnalysisModal } from './AiAnalysisModal';
import { useNewsFeed, type NewsFilters } from '@/hooks/useNews';
import { relativeTime } from '@/lib/format';
import type { NewsItem } from '@/types';

const CATEGORIES = ['', 'markets', 'economy', 'business'];

function ImportanceDot({ score }: { score: number }) {
  const color = score >= 40 ? '#ea3943' : score >= 20 ? '#f0b90b' : '#6b7280';
  return (
    <span
      title={`Importance ${score}/100`}
      className="inline-block h-2 w-2 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

function Row({ item, onAnalyze }: { item: NewsItem; onAnalyze: (i: NewsItem) => void }) {
  return (
    <div className="border-b border-border/60 py-3 last:border-0">
      <div className="flex items-start gap-2">
        <div className="mt-1.5">
          <ImportanceDot score={item.importance} />
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-medium leading-snug text-gray-100 hover:text-accent"
          >
            {item.title} <LinkOutlined className="text-[10px] text-gray-500" />
          </a>
          {item.summary && (
            <p className="mt-1 line-clamp-2 text-[12px] text-gray-400">{item.summary}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-gray-500">
            <span className="font-medium text-gray-400">{item.source}</span>
            <span>·</span>
            <span>{relativeTime(item.publishedAt)}</span>
            {item.country && <Tag className="!m-0 !border-0 !bg-panel2 !text-[10px]">{item.country}</Tag>}
            {item.relatedAssets.slice(0, 4).map((a) => (
              <Tag key={a} color="geekblue" className="!m-0 !text-[10px]">
                {a}
              </Tag>
            ))}
            <Button
              size="small"
              type="text"
              icon={<ThunderboltOutlined />}
              className="!h-5 !px-1.5 !text-[11px] !text-accent"
              onClick={() => onAnalyze(item)}
            >
              AI
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function NewsFeed({ liveItems }: { liveItems: NewsItem[] }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [important, setImportant] = useState(false);
  const [selected, setSelected] = useState<NewsItem | null>(null);

  const filters: NewsFilters = useMemo(
    () => ({ search: debounced, category, minImportance: important ? 30 : undefined }),
    [debounced, category, important],
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNewsFeed(filters);

  // Merge live WS items on top when no filters are active.
  const showLive = !debounced && !category && !important;
  const merged = useMemo(() => {
    const pageItems = data?.pages.flatMap((p) => p.items) ?? [];
    if (!showLive) return pageItems;
    const seen = new Set<string>();
    const combined = [...liveItems, ...pageItems];
    return combined.filter((i) => (seen.has(i.id) ? false : seen.add(i.id)));
  }, [showLive, liveItems, data]);

  const runSearch = () => setDebounced(search.trim());

  return (
    <>
      <Panel
        title="Live News Feed"
        subtitle="Real-time from CNBC, Yahoo Finance, Investing.com, FT & more"
        className="flex h-full flex-col"
        bodyClassName="flex-1 overflow-hidden flex flex-col"
        action={
          <div className="flex items-center gap-2">
            <Select
              size="small"
              value={category}
              style={{ width: 110 }}
              onChange={setCategory}
              options={CATEGORIES.map((c) => ({ value: c, label: c || 'All topics' }))}
            />
            <Button
              size="small"
              type={important ? 'primary' : 'default'}
              onClick={() => setImportant((v) => !v)}
            >
              High impact
            </Button>
          </div>
        }
      >
        <Input
          allowClear
          prefix={<SearchOutlined className="text-gray-500" />}
          placeholder="Search headlines…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!e.target.value) setDebounced('');
          }}
          onPressEnter={runSearch}
          className="mb-2"
        />

        <div className="-mr-2 max-h-[560px] flex-1 overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spin />
            </div>
          ) : merged.length === 0 ? (
            <Empty description="No news yet — the ingester runs every 5 minutes" />
          ) : (
            <>
              {merged.map((item) => (
                <Row key={item.id} item={item} onAnalyze={setSelected} />
              ))}
              {hasNextPage && showLive && (
                <div className="py-3 text-center">
                  <Button size="small" loading={isFetchingNextPage} onClick={() => fetchNextPage()}>
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </Panel>

      <AiAnalysisModal article={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  );
}
