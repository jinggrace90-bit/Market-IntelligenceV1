'use client';

import { useState } from 'react';
import { AutoComplete, Button, Badge, Dropdown, message } from 'antd';
import { SearchOutlined, UserOutlined, LogoutOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { api, apiError } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useThemeStore } from '@/store/theme';
import { useAddToWatchlist } from '@/hooks/useWatchlist';

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

  const onSearch = async (q: string) => {
    if (q.length < 1) return setOptions([]);
    try {
      const { data } = await api.get('/search', { params: { q } });
      const instruments: SearchOption[] = (data.data.instruments ?? []).map((i: any) => ({
        value: i.symbol,
        kind: 'instrument' as const,
        name: i.name,
        label: (
          <div className="flex justify-between">
            <span className="font-medium">{i.symbol}</span>
            <span className="ml-2 truncate text-secondary">{i.name}</span>
          </div>
        ),
      }));
      const news: SearchOption[] = (data.data.news ?? []).slice(0, 4).map((n: any) => ({
        value: n.url,
        kind: 'news' as const,
        label: <span className="text-secondary">📰 {n.title}</span>,
      }));
      setOptions([...instruments, ...news]);
    } catch {
      setOptions([]);
    }
  };

  const onSelect = async (value: string, option: SearchOption) => {
    if (option.kind === 'news') {
      window.open(value, '_blank');
      setQuery('');
      return;
    }

    if (!user) {
      message.info('Sign in to add instruments to your watchlist.');
      router.push('/login');
      return;
    }

    try {
      await addToWatchlist.mutateAsync({ symbol: value, name: option.name });
      message.success(`${value} added to your watchlist`);
    } catch (e) {
      message.error(apiError(e));
    } finally {
      setQuery('');
    }
  };

  return (
    <header
      className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-bg/90 px-3 py-3 backdrop-blur sm:gap-4 sm:px-4 md:px-6"
      style={{ boxShadow: 'var(--header-shadow)' }}
    >
      <div className="flex shrink-0 items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-bold text-white">
          M
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-semibold text-primary">Market Intelligence</div>
          <div className="-mt-0.5 text-[10px] text-muted">Real-time macro &amp; news</div>
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
          popupMatchSelectWidth={Math.min(420, typeof window !== 'undefined' ? window.innerWidth - 32 : 420)}
        >
          <div className="relative">
            <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-muted" />
            <input
              className="h-9 w-full rounded-lg border border-border bg-panel pl-9 pr-3 text-sm text-primary outline-none placeholder:text-faint focus:border-accent"
              placeholder="Search stocks, crypto, commodities, news…"
            />
          </div>
        </AutoComplete>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Button
          type="text"
          size="small"
          icon={theme === 'dark' ? <SunOutlined /> : <MoonOutlined />}
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        />
        <Badge
          status={connected ? 'success' : 'warning'}
          text={<span className="hidden text-[11px] text-secondary md:inline">{connected ? 'Live' : 'Connecting'}</span>}
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
            <Button icon={<UserOutlined />} size="small">
              <span className="hidden sm:inline">{user.name ?? 'Account'}</span>
            </Button>
          </Dropdown>
        ) : (
          <Button type="primary" size="small" onClick={() => router.push('/login')}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
}
