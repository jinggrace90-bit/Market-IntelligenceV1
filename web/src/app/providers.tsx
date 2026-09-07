'use client';

import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';
import '@ant-design/v5-patch-for-react-19';
import { useThemeStore, initTheme } from '@/store/theme';

// Bridge to the theme the pre-hydration script chose, before first paint on
// the client. Falls back to a no-op effect on the server.
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

const darkTokens = {
  colorPrimaryBg: '#0a0a0f',
  colorPrimary: '#a58bff',
  colorBgBase: '#0a0a0f',
  colorBgContainer: '#14141c',
  colorBgElevated: '#181820',
  colorBorder: 'rgba(255,255,255,0.10)',
  borderRadius: 10,
  fontSize: 13,
};

const lightTokens = {
  colorPrimaryBg: '#f6f4ef',
  colorPrimary: '#5b3fd1',
  colorBgBase: '#f6f4ef',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBorder: 'rgba(11,11,17,0.10)',
  borderRadius: 10,
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

  // Sync store to the theme the inline pre-hydration script chose,
  // BEFORE first paint. This prevents the AntD ConfigProvider from
  // briefly rendering under the wrong algorithm on refresh.
  useIsoLayoutEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    document.documentElement.style.colorScheme = currentTheme;
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
