'use client';

import { useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider, theme } from 'antd';
import '@ant-design/v5-patch-for-react-19';

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

  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          algorithm: theme.darkAlgorithm,
          token: {
            colorPrimaryBg: '#0a0e17',
            colorPrimary: '#3b82f6',
            colorBgBase: '#0a0e17',
            colorBgContainer: '#111725',
            colorBgElevated: '#161d2e',
            colorBorder: '#1f2937',
            borderRadius: 8,
            fontSize: 13,
          },
          components: {
            Card: { colorBgContainer: '#111725' },
            Table: { colorBgContainer: '#111725', headerBg: '#161d2e' },
          },
        }}
      >
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ConfigProvider>
    </AntdRegistry>
  );
}
