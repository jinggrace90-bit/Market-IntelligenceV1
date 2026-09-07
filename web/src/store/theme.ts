'use client';

import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  // The pre-hydration script in layout.tsx already resolved the theme
  // and stamped it on <html data-theme=…>. Prefer that (survives dev tools
  // overrides), then fall back to localStorage, then to dark.
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  try {
    const stored = localStorage.getItem('mid_theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  toggle: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('mid_theme', next); } catch {}
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.style.colorScheme = next;
    }
    set({ theme: next });
  },
}));

export function initTheme() {
  useThemeStore.setState({ theme: getInitial() });
}
