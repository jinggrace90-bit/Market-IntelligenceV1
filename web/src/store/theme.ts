'use client';

import { create } from 'zustand';

type Theme = 'dark' | 'light';

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

function getInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
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
    set({ theme: next });
  },
}));

export function initTheme() {
  useThemeStore.setState({ theme: getInitial() });
}
