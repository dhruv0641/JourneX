'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { Dialog } from 'radix-ui';
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
  Mic,
  MicOff,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Sun,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { runGlobalSearch } from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { GlobalSearchResultItem, TopicRow } from '@/types/domain';

type VoiceRecognition = {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  abort: () => void;
};

type VoiceWindow = Window & {
  SpeechRecognition?: new () => VoiceRecognition;
  webkitSpeechRecognition?: new () => VoiceRecognition;
};

export function CommandPalette({ topics }: { topics: TopicRow[] }) {
  const open = useUiStore((s) => s.commandPaletteOpen);
  const setOpen = useUiStore((s) => s.setCommandPaletteOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.repeat && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!useUiStore.getState().commandPaletteOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setOpen]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {open && <SearchDialog topics={topics} closePalette={() => setOpen(false)} />}
    </Dialog.Root>
  );
}

function cancelRecognition(recognition: VoiceRecognition | null) {
  if (!recognition) return;
  recognition.onresult = null;
  recognition.onerror = null;
  recognition.onend = null;
  recognition.abort();
}

function SearchDialog({ topics, closePalette }: { topics: TopicRow[]; closePalette: () => void }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<{
    query: string;
    items: GlobalSearchResultItem[];
    failed?: boolean;
  }>();
  const trimmed = query.trim();
  const results = trimmed && response?.query === trimmed ? response.items : [];
  const loading = Boolean(trimmed && response?.query !== trimmed);
  const inputRef = useRef<HTMLInputElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<VoiceRecognition | null>(null);

  const stopListening = () => {
    cancelRecognition(recognitionRef.current);
    recognitionRef.current = null;
    setListening(false);
  };

  const startListening = () => {
    if (listening) {
      stopListening();
      return;
    }
    const voiceWindow = window as VoiceWindow;
    const Recognition = voiceWindow.SpeechRecognition ?? voiceWindow.webkitSpeechRecognition;
    if (!Recognition) {
      setVoiceError('Voice search is unavailable in this browser. Type to search instead.');
      return;
    }
    setVoiceError('');
    const recognition = new Recognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) setQuery(transcript);
    };
    recognition.onerror = (event) => {
      setVoiceError(
        event.error === 'not-allowed'
          ? 'Microphone access is off. Allow it in your browser or type your search.'
          : 'Voice search could not hear you. Try again or type your search.',
      );
      setListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      recognitionRef.current = null;
      setVoiceError('Voice search could not start. Type to search instead.');
    }
  };

  useEffect(() => {
    if (!trimmed) return;
    let current = true;
    const handle = window.setTimeout(async () => {
      try {
        const items = await runGlobalSearch(createClient(), trimmed, 24);
        if (current) setResponse({ query: trimmed, items });
      } catch {
        if (current) setResponse({ query: trimmed, items: [], failed: true });
      }
    }, 220);
    return () => {
      current = false;
      window.clearTimeout(handle);
    };
  }, [trimmed]);

  useEffect(() => () => cancelRecognition(recognitionRef.current), []);

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
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in" />
      <Dialog.Content
        aria-describedby={undefined}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
          inputRef.current?.focus({ preventScroll: true });
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          openerRef.current?.focus({ preventScroll: true });
        }}
        className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-50 mx-auto max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto overscroll-contain rounded-2xl border border-border bg-card text-card-foreground shadow-2xl sm:top-[10dvh] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:duration-200"
      >
        <Dialog.Title className="sr-only">Global search and command palette</Dialog.Title>
        <Command label="Search workspace" loop>
          <div className="flex items-center gap-2 border-b border-border px-3.5">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <Command.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              autoComplete="off"
              placeholder="Search your workspace…"
              className="h-14 min-w-0 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={startListening}
              aria-label={listening ? 'Stop voice search' : 'Start voice search'}
              aria-pressed={listening}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {listening ? (
                <MicOff className="h-5 w-5 text-destructive" aria-hidden="true" />
              ) : (
                <Mic className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <Dialog.Close
              aria-label="Close search"
              className="flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </Dialog.Close>
          </div>

          {listening ? (
            <p role="status" className="px-4 py-2 text-sm text-primary">
              Listening… speak your search.
            </p>
          ) : null}
          {voiceError ? (
            <p role="status" className="px-4 py-2 text-sm text-destructive">
              {voiceError}
            </p>
          ) : null}

          <Command.List className="max-h-[min(24rem,65dvh)] overflow-y-auto overscroll-contain p-2">
            {loading ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                Searching workspace…
              </div>
            ) : null}

            {!loading && results.length === 0 && (
              <Command.Empty className="px-3 py-6 text-center text-xs text-muted-foreground">
                {response?.query === trimmed && response?.failed
                  ? 'Could not search your workspace. Try again in a moment.'
                  : 'No matching records or commands found.'}
              </Command.Empty>
            )}

            {results.length > 0 ? (
              <Command.Group
                forceMount
                heading="Search Results"
                className="px-1 py-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {results.map((item) => (
                  <Command.Item
                    forceMount
                    key={`${item.entity_type}-${item.entity_id}`}
                    value={`${item.entity_type}-${item.entity_id}`}
                    onSelect={() => navigate(item.href)}
                    className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      {renderIcon(item.entity_type)}
                      <span className="truncate font-medium">{item.title}</span>
                    </div>
                    <span className="max-w-[40%] truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>
            ) : null}

            <Command.Group
              heading="Quick Actions"
              className="px-1 py-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              <Command.Item
                value="Create new topic wizard"
                onSelect={() => navigate('/topics/new')}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
                <span>Create New Topic</span>
              </Command.Item>
              <Command.Item
                value="Go to Today global dashboard"
                onSelect={() => navigate('/dashboard')}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                <LayoutDashboard className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>Today</span>
              </Command.Item>
              <Command.Item
                value="Review workspace analytics and widgets"
                onSelect={() => navigate('/review')}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 text-sm aria-selected:bg-muted"
              >
                <Activity size={16} aria-hidden="true" />
                <span>Workspace review</span>
              </Command.Item>
              <Command.Item
                value="Browse all topics"
                onSelect={() => navigate('/topics')}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                <Layers className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>All Topics</span>
              </Command.Item>
              <Command.Item
                value="View workspace activity"
                onSelect={() => navigate('/activity')}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
              >
                <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>Activity Timeline</span>
              </Command.Item>
              <Command.Item
                value="Open settings and export"
                onSelect={() => navigate('/settings')}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
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
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
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
                className="px-1 py-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
              >
                {topics.slice(0, 8).map((t) => (
                  <Command.Item
                    key={t.id}
                    value={`topic ${t.name} ${t.category}`}
                    onSelect={() => navigate(`/topics/${t.slug}`)}
                    className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-md px-3 py-2 text-sm text-foreground aria-selected:bg-muted"
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
      </Dialog.Content>
    </Dialog.Portal>
  );
}
