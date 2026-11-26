'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { NotebookPen, Plus, Save, Search, Trash2 } from 'lucide-react';
import { ConflictBanner, EmptyState } from '@/components/shared/state-views';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, NativeSelect } from '@/components/ui/input';
import { sanitizeRichHtml } from '@/lib/security/sanitize';
import { createClient } from '@/lib/supabase/client';
import { formatDateInZone } from '@/lib/utilities/dates';
import { AppConflictError } from '@/lib/validation/common';
import {
  deleteJournalEntry,
  listJournalEntries,
  saveJournalEntry,
} from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { JournalEntryRow, TopicModuleRow } from '@/types/domain';

const MOODS = ['Focused', 'Confident', 'Neutral', 'Tired', 'Challenged'];
const ENTRY_TEMPLATES: Record<string, string> = {
  'Daily Check-in': '<p><strong>Key win today:</strong> </p><p><strong>Focus next:</strong> </p>',
  'Error & Lesson Log':
    '<p><strong>What broke / mistake:</strong> </p><p><strong>Root cause & fix:</strong> </p>',
  'Reference Note': '<h3>Summary</h3><p></p><ul><li>Key point 1</li></ul>',
};

export function JournalModule({
  userId,
  topicId,
  module: mod,
  timezone,
}: {
  userId: string;
  topicId: string;
  module: TopicModuleRow;
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const cfg = (mod.config ?? {}) as { enableMood?: boolean; categories?: string[] };
  const [mobilePane, setMobilePane] = useState<'write' | 'entries'>('write');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | undefined>(undefined);
  const [editingVersion, setEditingVersion] = useState<number | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(cfg.categories?.[0] ?? 'Reflection');
  const [mood, setMood] = useState('Focused');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [htmlBody, setHtmlBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState<string | null>(null);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement | null>(null);

  const { data: entries = [], refetch } = useQuery({
    queryKey: ['journal-entries', userId, topicId, mod.id, search],
    queryFn: () => listJournalEntries(createClient(), userId, topicId, mod.id, search),
  });

  // Draft autosave when editing existing entry
  useEffect(() => {
    if (!editingId || !htmlBody.trim()) return;
    const timer = window.setTimeout(async () => {
      try {
        const saved = await saveJournalEntry(createClient(), userId, {
          id: editingId,
          topic_id: topicId,
          module_id: mod.id,
          title: title || 'Untitled Draft',
          content_html: htmlBody,
          category,
          mood: cfg.enableMood !== false ? mood : null,
          entry_date: entryDate,
          is_draft: false,
          expectedVersion: editingVersion,
        });
        setEditingVersion(saved.version);
        setAutosaveStatus('Saved automatically');
      } catch {
        // Handled explicitly on manual save
      }
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [
    editingId,
    htmlBody,
    title,
    category,
    mood,
    entryDate,
    editingVersion,
    userId,
    topicId,
    mod.id,
    cfg.enableMood,
  ]);

  function startNew(templateKey?: string) {
    setMobilePane('write');
    setEditingId(undefined);
    setEditingVersion(undefined);
    setTitle('');
    setEntryDate(new Date().toISOString().slice(0, 10));
    const initialHtml = templateKey ? (ENTRY_TEMPLATES[templateKey] ?? '') : '';
    setHtmlBody(initialHtml);
    if (editorRef.current) editorRef.current.innerHTML = initialHtml;
    setAutosaveStatus(null);
    setConflictMsg(null);
  }

  function loadEntry(entry: JournalEntryRow) {
    setMobilePane('write');
    setEditingId(entry.id);
    setEditingVersion(entry.version);
    setTitle(entry.title);
    setCategory(entry.category ?? 'Reflection');
    setMood(entry.mood ?? 'Focused');
    setEntryDate(entry.entry_date);
    const clean = sanitizeRichHtml(entry.content_html);
    setHtmlBody(clean);
    if (editorRef.current) editorRef.current.innerHTML = clean;
    setAutosaveStatus(null);
    setConflictMsg(null);
  }

  async function handleSave(isDraft: boolean) {
    setSaving(true);
    setConflictMsg(null);
    try {
      const currentHtml = editorRef.current?.innerHTML ?? htmlBody;
      const saved = await saveJournalEntry(createClient(), userId, {
        id: editingId,
        topic_id: topicId,
        module_id: mod.id,
        title: title.trim() || `Entry ${entryDate}`,
        content_html: currentHtml,
        category,
        mood: cfg.enableMood !== false ? mood : null,
        entry_date: entryDate,
        is_draft: isDraft,
        expectedVersion: editingVersion,
      });
      setEditingId(saved.id);
      setEditingVersion(saved.version);
      setAutosaveStatus(isDraft ? 'Draft saved' : 'Published');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['journal-entries'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
        queryClient.invalidateQueries({ queryKey: ['topic-analytics'] }),
      ]);
      pushToast({ kind: 'success', title: isDraft ? 'Draft saved' : 'Journal entry saved' });
    } catch (err) {
      if (err instanceof AppConflictError) {
        setConflictMsg(err.message);
      } else {
        pushToast({
          kind: 'error',
          title: 'Failed to save entry',
          description: err instanceof Error ? err.message : 'Try again.',
        });
      }
    } finally {
      setSaving(false);
    }
  }

  function execFormat(command: string, value?: string) {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setHtmlBody(editorRef.current.innerHTML);
    }
  }

  return (
    <div className="grid items-start gap-4 lg:grid-cols-12 lg:gap-5">
      <div
        role="group"
        aria-label="Journal view"
        className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 lg:hidden"
      >
        <Button
          variant={mobilePane === 'write' ? 'outline' : 'ghost'}
          aria-pressed={mobilePane === 'write'}
          onClick={() => setMobilePane('write')}
        >
          Write
        </Button>
        <Button
          variant={mobilePane === 'entries' ? 'outline' : 'ghost'}
          aria-pressed={mobilePane === 'entries'}
          onClick={() => setMobilePane('entries')}
        >
          Entries
        </Button>
      </div>
      <div
        className={`min-w-0 space-y-4 lg:col-span-5 lg:block ${mobilePane === 'entries' ? 'block' : 'hidden'}`}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{mod.name}</h2>
          <Button size="sm" onClick={() => startNew('Daily Check-in')}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            New Entry
          </Button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            aria-label="Search journal entries"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search entries…"
            className="pl-9"
          />
        </div>

        {entries.length === 0 ? (
          <EmptyState
            icon={<NotebookPen className="h-5 w-5" aria-hidden="true" />}
            title="No entries yet"
            description="Write a reflection, technical note, or progress summary on the right."
          />
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <Card
                key={entry.id}
                className={editingId === entry.id ? 'border-primary bg-primary/5' : ''}
              >
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => loadEntry(entry)}
                      className="min-w-0 flex-1 cursor-pointer text-left"
                    >
                      <p className="truncate text-sm font-semibold">
                        {entry.title || entry.entry_date}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {entry.content_text || 'Empty entry'}
                      </p>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete entry"
                      onClick={async () => {
                        await deleteJournalEntry(createClient(), userId, entry.id);
                        if (editingId === entry.id) startNew();
                        await queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-muted-foreground">
                      {formatDateInZone(entry.entry_date, timezone)}
                    </span>
                    {entry.category ? <Badge variant="outline">{entry.category}</Badge> : null}
                    {entry.mood ? <Badge variant="primary">{entry.mood}</Badge> : null}
                    {entry.is_draft ? <Badge variant="warning">Draft</Badge> : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div
        className={`min-w-0 lg:col-span-7 lg:block ${mobilePane === 'write' ? 'block' : 'hidden'}`}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>{editingId ? 'Edit Entry' : 'New Entry'}</CardTitle>
              <div className="flex items-center gap-2">
                {autosaveStatus ? (
                  <span role="status" className="text-xs text-muted-foreground">
                    {autosaveStatus}
                  </span>
                ) : null}
                <NativeSelect
                  aria-label="Apply journal template"
                  defaultValue=""
                  onChange={(e) => {
                    if (e.target.value) startNew(e.target.value);
                  }}
                  className="min-h-9 w-40 text-xs"
                >
                  <option value="">Templates…</option>
                  {Object.keys(ENTRY_TEMPLATES).map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {conflictMsg ? (
              <ConflictBanner message={conflictMsg} onReload={() => void refetch()} />
            ) : null}

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 sm:col-span-3">
                <Label htmlFor={`journal-title-${mod.id}`}>Title</Label>
                <Input
                  id={`journal-title-${mod.id}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Session notes or daily reflection title…"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`journal-date-${mod.id}`}>Date</Label>
                <Input
                  id={`journal-date-${mod.id}`}
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`journal-cat-${mod.id}`}>Category</Label>
                <Input
                  id={`journal-cat-${mod.id}`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>
              {cfg.enableMood !== false ? (
                <div className="space-y-1">
                  <Label htmlFor={`journal-mood-${mod.id}`}>Mood</Label>
                  <NativeSelect
                    id={`journal-mood-${mod.id}`}
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                  >
                    {MOODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-lg border border-input">
              <div className="flex flex-wrap gap-1 border-b border-border bg-muted/40 p-1.5">
                {[
                  { label: 'Bold', cmd: 'bold' },
                  { label: 'Italic', cmd: 'italic' },
                  { label: 'List', cmd: 'insertUnorderedList' },
                  { label: 'Quote', cmd: 'formatBlock', val: 'blockquote' },
                  { label: 'H3', cmd: 'formatBlock', val: 'h3' },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={() => execFormat(btn.cmd, btn.val)}
                    className="min-h-11 min-w-11 cursor-pointer rounded px-2.5 py-1 text-sm font-medium hover:bg-muted"
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              <div
                ref={editorRef}
                contentEditable
                role="textbox"
                aria-multiline="true"
                aria-label="Journal rich text editor"
                onInput={(e) => setHtmlBody((e.target as HTMLDivElement).innerHTML)}
                className="min-h-56 bg-card p-4 text-base leading-relaxed focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" disabled={saving} onClick={() => void handleSave(true)}>
                Save Draft
              </Button>
              <Button disabled={saving} onClick={() => void handleSave(false)}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Publish Entry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
