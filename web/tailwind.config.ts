import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0a0e17',
        panel: '#111725',
        panel2: '#161d2e',
        border: '#1f2937',
        up: '#16c784',
        down: '#ea3943',
        accent: '#3b82f6',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
    },
  },
  // AntD owns most component styling; disable preflight to avoid resets clashing.
  corePlugins: { preflight: false },
  plugins: [],
};

export default config;
