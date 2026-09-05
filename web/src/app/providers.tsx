'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';
import '@ant-design/v5-patch-for-react-19';
import { useThemeStore, initTheme } from '@/store/theme';

const darkTokens = {
  colorPrimaryBg: '#0a0e17',
  colorPrimary: '#2563eb',
  colorBgBase: '#0a0e17',
  colorBgContainer: '#111725',
  colorBgElevated: '#161d2e',
  colorBorder: '#1f2937',
  borderRadius: 8,
  fontSize: 13,
};

const lightTokens = {
  colorPrimaryBg: '#f5f6f8',
  colorPrimary: '#2563eb',
  colorBgBase: '#f5f6f8',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBorder: '#e2e4e9',
  borderRadius: 8,
  fontSize: 13,
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  const currentTheme = useThemeStore((s) => s.theme);

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  const isDark = currentTheme === 'dark';

  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: isDark ? darkTokens : lightTokens,
          components: isDark
            ? {
                Card: { colorBgContainer: '#111725' },
                Table: { colorBgContainer: '#111725', headerBg: '#161d2e' },
              }
            : {
                Card: { colorBgContainer: '#ffffff' },
                Table: { colorBgContainer: '#ffffff', headerBg: '#f0f1f4' },
              },
        }}
      >
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ConfigProvider>
    </AntdRegistry>
  );
}
