'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { useTheme } from 'next-themes';
import {
  Activity,
  Calculator,
  CheckSquare,
  FileText,
  Hash,
  Layers,
  LayoutDashboard,
  Moon,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { runGlobalSearch } from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { GlobalSearchResultItem, TopicRow } from '@/types/domain';

export function CommandPalette({ topics }: { topics: TopicRow[] }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);

  const closePalette = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) {
          setQuery('');
          setResults([]);
          setOpen(false);
        } else {
          setOpen(true);
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!open || !trimmed) return;

    const handle = window.setTimeout(async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const found = await runGlobalSearch(supabase, trimmed, 24);
        setResults(found);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(handle);
  }, [open, query]);

  if (!open) return null;

  const navigate = (href: string) => {
    closePalette();
    router.push(href);
  };

  const renderIcon = (entityType: GlobalSearchResultItem['entity_type']) => {
    switch (entityType) {
      case 'topic':
        return <Layers className="h-4 w-4 text-primary" aria-hidden="true" />;
      case 'task':
        return <CheckSquare className="h-4 w-4 text-success" aria-hidden="true" />;
      case 'journal':
        return <NotebookPen className="h-4 w-4 text-accent" aria-hidden="true" />;
      case 'calculator':
        return <Calculator className="h-4 w-4 text-primary" aria-hidden="true" />;
      case 'tag':
        return <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global search and command palette"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 px-4 pt-[12vh] backdrop-blur-[1px]"
      onClick={closePalette}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={!query.trim()} label="Command palette">
          <div className="flex items-center gap-2 border-b border-border px-3.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={(nextVal) => {
                setQuery(nextVal);
                if (!nextVal.trim()) {
                  setResults([]);
                  setLoading(false);
                }
              }}
              placeholder="Search topics, tasks, journals, records, calculators, or run an action…"
              className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-block">
              ESC
            </kbd>
          </div>

          <Command.List className="max-h-96 overflow-y-auto overscroll-contain p-2">
            {loading ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Searching workspace…
              </div>
            ) : null}

            <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
              No matching records or commands found.
            </Command.Empty>

            {results.length > 0 ? (
              <Command.Group
                heading="Search Results"
                className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {results.map((item) => (
                  <Command.Item
                    key={`${item.entity_type}-${item.entity_id}`}
                    value={`${item.title} ${item.subtitle}`}
                    onSelect={() => navigate(item.href)}
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {renderIcon(item.entity_type)}
                      <span className="truncate font-medium">{item.title}</span>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">{item.subtitle}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Group
              heading="Quick Actions"
              className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              <Command.Item
                value="Create new topic wizard"
                onSelect={() => navigate('/topics/new')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Create New Topic</span>
              </Command.Item>
              <Command.Item
                value="Go to global dashboard"
                onSelect={() => navigate('/dashboard')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>Global Dashboard</span>
              </Command.Item>
              <Command.Item
                value="Browse all topics"
                onSelect={() => navigate('/topics')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>All Topics</span>
              </Command.Item>
              <Command.Item
                value="View workspace activity"
                onSelect={() => navigate('/activity')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>Activity Timeline</span>
              </Command.Item>
              <Command.Item
                value="Open settings and export"
                onSelect={() => navigate('/settings')}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                <Settings className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>Workspace Settings &amp; Export</span>
              </Command.Item>
              <Command.Item
                value="Switch light or dark theme"
                onSelect={() => {
                  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                  closePalette();
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4 text-accent" aria-hidden="true" />
                ) : (
                  <Moon className="h-4 w-4 text-primary" aria-hidden="true" />
                )}
                <span>Switch to {resolvedTheme === 'dark' ? 'Light' : 'Dark'} Theme</span>
              </Command.Item>
            </Command.Group>

            {topics.length > 0 && !query.trim() ? (
              <Command.Group
                heading="Topics"
                className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
              >
                {topics.slice(0, 8).map((t) => (
                  <Command.Item
                    key={t.id}
                    value={`topic ${t.name} ${t.category}`}
                    onSelect={() => navigate(`/topics/${t.slug}`)}
                    className="flex cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: t.accent_color }}
                        aria-hidden="true"
                      />
                      <span className="truncate">{t.name}</span>
                    </div>
                    <span className="text-xs capitalize text-muted-foreground">{t.category}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
