'use client';

import { useSyncExternalStore } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';

const emptySubscribe = () => () => {};

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const current = mounted ? theme ?? 'system' : 'system';
  const effective = mounted ? resolvedTheme ?? 'light' : 'light';

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const;
    const idx = order.indexOf(current as (typeof order)[number]);
    const next = order[(idx + 1) % order.length] ?? 'light';
    setTheme(next);
  };

  return (
    <Button
      variant="ghost"
      size={compact ? 'icon' : 'sm'}
      onClick={cycleTheme}
      aria-label={`Switch theme (current: ${current})`}
      title={`Theme: ${current}`}
      className="h-10 min-w-10"
    >
      {current === 'system' ? (
        <Monitor className="h-4 w-4" aria-hidden="true" />
      ) : effective === 'dark' ? (
        <Moon className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Sun className="h-4 w-4" aria-hidden="true" />
      )}
      {!compact ? <span className="capitalize">{current}</span> : null}
    </Button>
  );
}
