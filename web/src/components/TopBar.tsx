'use client';

import { useCallback, useRef, useState } from 'react';
import { AutoComplete, Button, Dropdown, message } from 'antd';
import {
  SearchOutlined,
  UserOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  PlusOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useAddToWatchlist } from '@/hooks/useWatchlist';
import { useHotkey } from '@/hooks/useHotkey';
import { ShortcutsModal } from './ShortcutsModal';

interface InstrumentHit {
  symbol: string;
  name?: string;
}

interface NewsHit {
  url: string;
  title: string;
}

interface SearchOption {
  value: string;
  label: React.ReactNode;
  kind: 'instrument' | 'news';
  name?: string;
}

export function TopBar({ connected }: { connected: boolean }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const addToWatchlist = useAddToWatchlist();
  const [options, setOptions] = useState<SearchOption[]>([]);
  const [query, setQuery] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  const focusSearch = useCallback((e: KeyboardEvent) => {
    e.preventDefault();
    searchRef.current?.focus();
  }, []);

  useHotkey('/', focusSearch);
  useHotkey('?', () => setHelpOpen(true));

  const addSymbol = useCallback(
    async (symbol: string, name?: string) => {
      if (!user) {
        message.info('Sign in to add instruments to your watchlist.');
        router.push('/login');
        return;
      }
      try {
        await addToWatchlist.mutateAsync({ symbol, name });
        message.success(`${symbol} added to your watchlist`);
      } catch (e) {
        message.error(apiError(e));
      }
    },
    [user, router, addToWatchlist],
  );

  const renderInstrumentLabel = (hit: InstrumentHit): React.ReactNode => (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className="font-mono text-[13px] font-medium">{hit.symbol}</span>
        {hit.name && <span className="truncate text-secondary italic font-serif">{hit.name}</span>}
      </div>
      <button
        type="button"
        aria-label={`Add ${hit.symbol} to watchlist`}
        title={user ? 'Add to watchlist' : 'Sign in to add to watchlist'}
        onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          addSymbol(hit.symbol, hit.name);
          setQuery('');
        }}
        className="ml-2 inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-border bg-panel2 px-2.5 text-[11px] font-medium text-secondary hover:border-accent hover:text-accent"
      >
        <PlusOutlined className="text-[10px]" />
        Watchlist
      </button>
    </div>
  );

  const renderNewsLabel = (hit: NewsHit): React.ReactNode => (
    <div className="flex items-center gap-2 text-secondary">
      <LinkOutlined className="text-[11px] text-muted" />
      <span className="truncate">{hit.title}</span>
    </div>
  );

  const onSearch = async (q: string) => {
    if (q.length < 1) return setOptions([]);
    try {
      const { data } = await api.get('/search', { params: { q } });
      const instruments: SearchOption[] = (data.data.instruments ?? []).map((i: InstrumentHit) => ({
        value: `instrument:${i.symbol}`,
        kind: 'instrument' as const,
        name: i.name,
        label: renderInstrumentLabel(i),
      }));
      const news: SearchOption[] = (data.data.news ?? []).slice(0, 4).map((n: NewsHit) => ({
        value: `news:${n.url}`,
        kind: 'news' as const,
        label: renderNewsLabel(n),
      }));
      setOptions([...instruments, ...news]);
    } catch {
      setOptions([]);
    }
  };

  const onSelect = (value: string, option: SearchOption) => {
    if (option.kind === 'news') {
      window.open(value.replace(/^news:/, ''), '_blank', 'noreferrer');
      setQuery('');
      return;
    }
    setQuery('');
  };

  return (
    <>
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 sm:gap-5 sm:px-6 md:px-8"
        style={{
          background: 'color-mix(in srgb, var(--color-bg) 78%, transparent)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          borderBottom: '1px solid var(--color-border)',
          boxShadow: 'var(--header-shadow)',
        }}
      >
        <div className="flex shrink-0 items-baseline gap-3">
          <span className="font-serif italic text-primary" style={{ fontSize: 26, lineHeight: 1, letterSpacing: '-0.02em' }}>
            M
          </span>
          <div className="hidden sm:block">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Market Intelligence
            </div>
            <div className="mt-0.5 font-serif italic text-[12px] text-muted">
              the market, in daylight
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 md:mx-auto md:max-w-md">
          <AutoComplete
            value={query}
            onChange={setQuery}
            options={options}
            onSearch={onSearch}
            onSelect={onSelect}
            className="w-full"
            popupMatchSelectWidth={Math.min(440, typeof window !== 'undefined' ? window.innerWidth - 32 : 440)}
          >
            <div className="relative">
              <SearchOutlined className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-muted" />
              <input
                ref={searchRef}
                className="glass h-10 w-full rounded-full pl-10 pr-16 text-[13px] text-primary outline-none placeholder:text-faint focus:border-accent"
                placeholder="Search stocks, crypto, commodities, news…"
              />
              <kbd
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-panel2 px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline-block"
              >
                /
              </kbd>
            </div>
          </AutoComplete>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            className="hidden items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] md:inline-flex"
            style={{
              color: connected ? 'var(--color-up)' : 'var(--color-amber)',
              background: connected
                ? 'color-mix(in srgb, var(--color-up) 12%, transparent)'
                : 'color-mix(in srgb, var(--color-amber) 12%, transparent)',
              borderColor: connected
                ? 'color-mix(in srgb, var(--color-up) 32%, transparent)'
                : 'color-mix(in srgb, var(--color-amber) 32%, transparent)',
            }}
          >
            <span
              className={connected ? 'live-dot' : 'h-1.5 w-1.5 rounded-full'}
              style={!connected ? { background: 'var(--color-amber)' } : undefined}
            />
            {connected ? 'Live' : 'Connecting'}
          </span>
          <Button
            type="text"
            size="small"
            onClick={() => setHelpOpen(true)}
            title="Keyboard shortcuts (?)"
            className="!hidden !font-mono !text-secondary hover:!text-primary sm:!inline-flex"
          >
            <span className="text-[13px]">?</span>
          </Button>
          <Button
            type="text"
            size="small"
            icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
            onClick={toggle}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          />
          {user ? (
            <Dropdown
              menu={{
                items: [
                  { key: 'email', label: user.email, disabled: true },
                  { type: 'divider' },
                  {
                    key: 'logout',
                    label: 'Log out',
                    icon: <LogoutOutlined />,
                    onClick: () => {
                      logout();
                      router.push('/login');
                    },
                  },
                ],
              }}
            >
              <Button icon={<UserOutlined />} size="small" shape="round">
                <span className="hidden sm:inline">{user.name ?? 'Account'}</span>
              </Button>
            </Dropdown>
          ) : (
            <Button type="primary" size="small" shape="round" onClick={() => router.push('/login')}>
              Sign in
            </Button>
          )}
        </div>
      </header>

      <ShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  );
}
