import { useEffect } from 'react';
import { create } from 'zustand';
import { useApp } from './store';

export const ACCENTS = [
  { name: 'Violet', hsl: '252 95% 68%' },
  { name: 'Ocean', hsl: '210 100% 62%' },
  { name: 'Emerald', hsl: '160 84% 44%' },
  { name: 'Sunset', hsl: '18 100% 62%' },
  { name: 'Rose', hsl: '340 90% 62%' },
  { name: 'Amber', hsl: '42 96% 56%' },
];

export function useThemeEffect() {
  const theme = useApp((s) => s.settings.theme);
  const accent = useApp((s) => s.settings.accent);

  useEffect(() => {
    const root = document.documentElement;
    const [h, s, l] = accent.split(' ');
    root.style.setProperty('--accent-h', h);
    root.style.setProperty('--accent-s', s);
    root.style.setProperty('--accent-l', l);

    const apply = (mode: 'light' | 'dark' | 'amoled') => {
      root.classList.remove('light', 'dark', 'amoled');
      root.classList.add(mode);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', mode === 'light' ? '#f7f7fb' : mode === 'amoled' ? '#000000' : '#121118');
    };

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      apply(mq.matches ? 'dark' : 'light');
      const cb = (e: MediaQueryListEvent) => apply(e.matches ? 'dark' : 'light');
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    }
    apply(theme);
  }, [theme, accent]);
}

/* ---------- global UI store (quick add sheet) ---------- */
export type QuickAction = 'habit' | 'task' | 'expense' | 'event' | 'journal' | 'mood' | 'focus' | null;

interface UIState {
  quickAction: QuickAction;
  moreOpen: boolean;
  setQuickAction: (a: QuickAction) => void;
  setMoreOpen: (b: boolean) => void;
}

export const useUI = create<UIState>((set) => ({
  quickAction: null,
  moreOpen: false,
  setQuickAction: (a) => set({ quickAction: a }),
  setMoreOpen: (b) => set({ moreOpen: b }),
}));
