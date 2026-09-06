import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        bg2: 'var(--color-bg-2)',
        panel: 'var(--color-panel)',
        panel2: 'var(--color-panel2)',
        border: 'var(--color-border)',
        'border-hi': 'var(--color-border-hi)',
        up: 'var(--color-up)',
        'up-soft': 'var(--color-up-soft)',
        down: 'var(--color-down)',
        'down-soft': 'var(--color-down-soft)',
        accent: 'var(--color-accent)',
        amber: 'var(--color-amber)',
      },
      textColor: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
        faint: 'var(--color-text-faint)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  corePlugins: { preflight: false },
  plugins: [],
};

export default config;
