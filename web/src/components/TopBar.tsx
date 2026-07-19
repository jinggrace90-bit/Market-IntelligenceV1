'use client';

import { useState } from 'react';
import { AutoComplete, Button, Badge, Dropdown } from 'antd';
import { SearchOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function TopBar({ connected }: { connected: boolean }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [options, setOptions] = useState<{ value: string; label: React.ReactNode }[]>([]);

  const onSearch = async (q: string) => {
    if (q.length < 1) return setOptions([]);
    try {
      const { data } = await api.get('/search', { params: { q } });
      const instruments = (data.data.instruments ?? []).map((i: any) => ({
        value: i.symbol,
        label: (
          <div className="flex justify-between">
            <span className="font-medium">{i.symbol}</span>
            <span className="ml-2 truncate text-gray-500">{i.name}</span>
          </div>
        ),
      }));
      const news = (data.data.news ?? []).slice(0, 4).map((n: any) => ({
        value: n.url,
        label: <span className="text-gray-400">📰 {n.title}</span>,
      }));
      setOptions([...instruments, ...news]);
    } catch {
      setOptions([]);
    }
  };

  const onSelect = (value: string) => {
    if (value.startsWith('http')) window.open(value, '_blank');
  };

  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-bg/90 px-3 py-3 backdrop-blur sm:gap-4 sm:px-4 md:px-6">
      <div className="flex shrink-0 items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent font-bold text-white">
          M
        </div>
        <div className="hidden sm:block">
          <div className="text-sm font-semibold text-gray-100">Market Intelligence</div>
          <div className="-mt-0.5 text-[10px] text-gray-500">Real-time macro &amp; news</div>
        </div>
      </div>

      <div className="min-w-0 flex-1 md:mx-auto md:max-w-md">
        <AutoComplete
          options={options}
          onSearch={onSearch}
          onSelect={onSelect}
          className="w-full"
          popupMatchSelectWidth={Math.min(420, typeof window !== 'undefined' ? window.innerWidth - 32 : 420)}
        >
          <div className="relative">
            <SearchOutlined className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-gray-500" />
            <input
              className="h-9 w-full rounded-lg border border-border bg-panel pl-9 pr-3 text-sm text-gray-100 outline-none placeholder:text-gray-600 focus:border-accent"
              placeholder="Search stocks, crypto, commodities, news…"
            />
          </div>
        </AutoComplete>
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Badge
          status={connected ? 'success' : 'warning'}
          text={<span className="hidden text-[11px] text-gray-400 md:inline">{connected ? 'Live' : 'Connecting'}</span>}
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
