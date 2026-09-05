'use client';

import { useEffect } from 'react';

type Handler = (e: KeyboardEvent) => void;

function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (node.isContentEditable) return true;
  return false;
}

interface Options {
  allowInInput?: boolean;
  enabled?: boolean;
}

export function useHotkey(key: string, handler: Handler, opts: Options = {}) {
  const { allowInInput = false, enabled = true } = opts;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!allowInInput && isTypingTarget(e.target)) return;
      if (e.key === key) handler(e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, handler, allowInInput, enabled]);
}
