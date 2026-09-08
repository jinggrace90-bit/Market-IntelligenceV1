import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Instrument_Sans, JetBrains_Mono } from 'next/font/google';
import { Providers } from './providers';
import { MouseGlow } from '@/components/MouseGlow';
import './globals.css';

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});
const sans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Market Intelligence — Real-Time Macro & News Dashboard',
  description:
    'A real-time AI market intelligence dashboard: live markets, news, sentiment, macro analysis, and an economic calendar for investors building financial literacy.',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0f' },
    { media: '(prefers-color-scheme: light)', color: '#f6f4ef' },
  ],
  width: 'device-width',
  initialScale: 1,
};

// Runs synchronously before hydration to prevent a dark→light (or vice versa) flash on refresh.
const themeInitScript = `(function(){try{var s=localStorage.getItem('mid_theme');var t=(s==='light'||s==='dark')?s:'dark';var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t;}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <div className="grain" aria-hidden />
        <MouseGlow />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
