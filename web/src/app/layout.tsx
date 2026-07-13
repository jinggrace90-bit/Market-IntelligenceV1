import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Market Intelligence — Real-Time Macro & News Dashboard',
  description:
    'A real-time AI market intelligence dashboard: live markets, news, sentiment, macro analysis, and an economic calendar for investors building financial literacy.',
};

export const viewport: Viewport = {
  themeColor: '#0a0e17',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
