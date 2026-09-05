'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Input, Select, Button, Tag, Empty, Spin } from 'antd';
import { SearchOutlined, ThunderboltOutlined, LinkOutlined } from '@ant-design/icons';
import { Panel } from './Panel';
import { AiAnalysisModal } from './AiAnalysisModal';
import { useHotkey } from '@/hooks/useHotkey';
import { useNewsFeed, type NewsFilters } from '@/hooks/useNews';
import { relativeTime } from '@/lib/format';
import type { NewsItem } from '@/types';

const CATEGORIES = ['', 'markets', 'economy', 'business'];
const FILTERS_STORAGE_KEY = 'newsfeed.filters.v1';

interface StoredFilters {
  category: string;
  important: boolean;
}

function loadFilters(): StoredFilters {
  if (typeof window === 'undefined') return { category: '', important: false };
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return { category: '', important: false };
    const parsed = JSON.parse(raw) as StoredFilters;
    return {
      category: typeof parsed.category === 'string' ? parsed.category : '',
      important: !!parsed.important,
    };
  } catch {
    return { category: '', important: false };
  }
}

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

function Row({
  item,
  onAnalyze,
  selected,
  rowRef,
}: {
  item: NewsItem;
  onAnalyze: (i: NewsItem) => void;
  selected: boolean;
  rowRef?: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div
      ref={rowRef}
      className={`border-b border-border/60 py-3 last:border-0 ${
        selected ? 'bg-panel2/70 -mx-2 rounded-md px-2' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="mt-1.5">
          <ImportanceDot score={item.importance} />
        </div>
        <div className="min-w-0 flex-1">
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="text-[13px] font-medium leading-snug text-primary hover:text-accent"
          >
            {item.title} <LinkOutlined className="text-[10px] text-muted" />
          </a>
          {item.summary && (
            <p className="mt-1 line-clamp-2 text-[12px] text-secondary">{item.summary}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
            <span className="font-medium text-secondary">{item.source}</span>
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
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    const saved = loadFilters();
    setCategory(saved.category);
    setImportant(saved.important);
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      window.localStorage.setItem(
        FILTERS_STORAGE_KEY,
        JSON.stringify({ category, important }),
      );
    } catch {
      // ignore
    }
  }, [category, important]);

  const filters: NewsFilters = useMemo(
    () => ({ search: debounced, category, minImportance: important ? 30 : undefined }),
    [debounced, category, important],
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNewsFeed(filters);

  const showLive = !debounced && !category && !important;
  const merged = useMemo(() => {
    const pageItems = data?.pages.flatMap((p) => p.items) ?? [];
    if (!showLive) return pageItems;
    const seen = new Set<string>();
    const combined = [...liveItems, ...pageItems];
    return combined.filter((i) => (seen.has(i.id) ? false : seen.add(i.id)));
  }, [showLive, liveItems, data]);

  const runSearch = () => setDebounced(search.trim());

  const scrollToRow = useCallback((idx: number) => {
    const el = rowRefs.current.get(idx);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, []);

  useHotkey('j', () => {
    if (merged.length === 0) return;
    setSelectedIdx((prev) => {
      const next = Math.min(merged.length - 1, prev + 1);
      requestAnimationFrame(() => scrollToRow(next));
      return next;
    });
  });

  useHotkey('k', () => {
    if (merged.length === 0) return;
    setSelectedIdx((prev) => {
      const next = Math.max(0, prev < 0 ? 0 : prev - 1);
      requestAnimationFrame(() => scrollToRow(next));
      return next;
    });
  });

  useHotkey('Enter', () => {
    if (selectedIdx < 0 || selectedIdx >= merged.length) return;
    window.open(merged[selectedIdx].url, '_blank', 'noreferrer');
  });

  useHotkey('a', () => {
    if (selectedIdx < 0 || selectedIdx >= merged.length) return;
    setSelected(merged[selectedIdx]);
  });

  useHotkey('Escape', () => setSelectedIdx(-1), { allowInInput: false });

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
          prefix={<SearchOutlined className="text-muted" />}
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
              {merged.map((item, idx) => (
                <Row
                  key={item.id}
                  item={item}
                  onAnalyze={setSelected}
                  selected={idx === selectedIdx}
                  rowRef={(el) => {
                    if (el) rowRefs.current.set(idx, el);
                    else rowRefs.current.delete(idx);
                  }}
                />
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
