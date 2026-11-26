'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArchiveRestore,
  Copy,
  Download,
  Layers,
  Pin,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/state-views';
import { TopicIcon } from '@/components/shared/topic-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input, NativeSelect } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { createIdempotencyKey } from '@/lib/utilities/csv';
import { formatDateInZone } from '@/lib/utilities/dates';
import {
  duplicateTopicAtomic,
  fetchTopicDetailBySlug,
  listTopics,
  softDeleteTopic,
  updateTopicWithVersion,
} from '@/services/topics.service';
import { useUiStore } from '@/stores/ui-store';
import type { TopicRow } from '@/types/domain';

export function TopicsDirectoryClient({
  userId,
  timezone,
  initialTopics,
  initialStatusFilter = 'active',
}: {
  userId: string;
  timezone: string;
  initialTopics: TopicRow[];
  initialStatusFilter?: 'active' | 'archived' | 'all';
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>(
    initialStatusFilter,
  );
  const [search, setSearch] = useState('');
  const [collection, setCollection] = useState<'all' | 'pinned' | 'favorites'>('all');
  const [deleteTarget, setDeleteTarget] = useState<TopicRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: topics = initialTopics } = useQuery({
    queryKey: ['topics', userId],
    queryFn: () => listTopics(createClient(), userId),
    initialData: initialTopics,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter((t) => {
      if (collection === 'pinned' && !t.is_pinned) return false;
      if (collection === 'favorites' && !t.is_favorite) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (q && !t.name.toLowerCase().includes(q) && !t.category.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [topics, statusFilter, search, collection]);

  async function refreshAll() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['topics'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
    ]);
    router.refresh();
  }

  async function handleTogglePin(topic: TopicRow) {
    setBusyId(topic.id);
    try {
      await updateTopicWithVersion(
        createClient(),
        userId,
        topic.id,
        { is_pinned: !topic.is_pinned },
        topic.version,
      );
      await refreshAll();
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Update conflict',
        description: err instanceof Error ? err.message : 'Please reload.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleToggleFavorite(topic: TopicRow) {
    setBusyId(topic.id);
    try {
      await updateTopicWithVersion(
        createClient(),
        userId,
        topic.id,
        { is_favorite: !topic.is_favorite },
        topic.version,
      );
      await refreshAll();
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Update conflict',
        description: err instanceof Error ? err.message : 'Please reload.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleArchiveToggle(topic: TopicRow) {
    setBusyId(topic.id);
    const target = topic.status === 'active' ? 'archived' : 'active';
    try {
      await updateTopicWithVersion(
        createClient(),
        userId,
        topic.id,
        {
          status: target,
          archived_at: target === 'archived' ? new Date().toISOString() : null,
        },
        topic.version,
      );
      await refreshAll();
      pushToast({
        kind: 'success',
        title: target === 'archived' ? `Archived "${topic.name}"` : `Restored "${topic.name}"`,
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleDuplicate(topic: TopicRow) {
    setBusyId(topic.id);
    try {
      const res = await duplicateTopicAtomic(
        createClient(),
        topic.id,
        `${topic.name} (Copy)`,
        createIdempotencyKey('dup'),
      );
      await refreshAll();
      pushToast({ kind: 'success', title: `Duplicated as "${res.topic.name}"` });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Duplicate failed',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    } finally {
      setBusyId(null);
    }
  }

  async function handleExportConfig(topic: TopicRow) {
    try {
      const bundle = await fetchTopicDetailBySlug(createClient(), userId, topic.slug);
      if (!bundle) return;
      const exportPayload = {
        name: bundle.topic.name,
        description: bundle.topic.description,
        purpose: bundle.topic.purpose,
        category: bundle.topic.category,
        icon: bundle.topic.icon,
        accent_color: bundle.topic.accent_color,
        modules: bundle.modules.map((m) => ({
          feature_key: m.feature_key,
          module_key: m.module_key,
          name: m.name,
          description: m.description,
          icon: m.icon,
          sort_order: m.sort_order,
          config: m.config,
          fields: bundle.fields
            .filter((f) => f.module_id === m.id)
            .map((f) => ({
              field_key: f.field_key,
              label: f.label,
              field_type: f.field_type,
              is_required: f.is_required,
              options: f.options,
              validation_rules: f.validation_rules,
              formula_expression: f.formula_expression,
              sort_order: f.sort_order,
            })),
        })),
        views: bundle.views.map((v) => ({
          view_type: v.view_type,
          name: v.name,
          sort_order: v.sort_order,
          is_default: v.is_default,
        })),
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic.slug}-config.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast({ kind: 'success', title: 'Topic configuration exported' });
    } catch {
      pushToast({ kind: 'error', title: 'Export failed' });
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      await softDeleteTopic(createClient(), userId, deleteTarget.id, deleteTarget.version);
      setDeleteTarget(null);
      await refreshAll();
      pushToast({ kind: 'success', title: 'Topic deleted' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Please reload.',
      });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">Topics &amp; Mini-Apps</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find a topic or create a space for your next project.
          </p>
        </div>
        <Link
          href="/topics/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-95"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          New Topic
        </Link>
      </div>

      <section
        aria-label="Browse topics"
        className="space-y-3 rounded-2xl border border-border bg-card p-3 sm:p-4"
      >
        <div
          className="flex flex-wrap items-center gap-1"
          role="group"
          aria-label="Topic collection"
        >
          {(
            [
              ['all', 'All topics', Layers],
              ['pinned', 'Pinned', Pin],
              ['favorites', 'Favorites', Star],
            ] as const
          ).map(([value, label, Icon]) => (
            <Button
              key={value}
              size="sm"
              variant={collection === value ? 'default' : 'ghost'}
              aria-pressed={collection === value}
              onClick={() => setCollection(value)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Button>
          ))}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Filter topics"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter topics by name or category…"
              className="pl-9"
            />
          </div>
          <NativeSelect
            aria-label="Topic status filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'active' | 'archived' | 'all')}
            className="sm:w-48"
          >
            <option value="active">Active Topics</option>
            <option value="archived">Archived Topics</option>
            <option value="all">All Topics</option>
          </NativeSelect>
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-5 w-5" aria-hidden="true" />}
          title={topics.length ? 'No topics match these filters' : 'Create your first topic'}
          description={
            topics.length
              ? 'Try another collection, status, or search term.'
              : 'Start with a project or interest, then choose the tools you need.'
          }
          action={
            topics.length ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setCollection('all');
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Link
                href="/topics/new"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Create Topic
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((topic) => (
            <Card key={topic.id} className="flex flex-col justify-between">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/topics/${topic.slug}`}
                    className="flex min-w-0 items-center gap-3 hover:underline"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: topic.accent_color }}
                    >
                      <TopicIcon name={topic.icon} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-semibold">{topic.name}</h2>
                      <p className="text-xs capitalize text-muted-foreground">{topic.category}</p>
                    </div>
                  </Link>
                  <Badge variant={topic.status === 'active' ? 'success' : 'outline'}>
                    {topic.status}
                  </Badge>
                </div>

                {topic.description ? (
                  <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
                    {topic.description}
                  </p>
                ) : null}

                <p className="mt-3 text-xs text-muted-foreground">
                  Updated {formatDateInZone(topic.updated_at, timezone)}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-1.5 border-t border-border pt-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busyId === topic.id}
                      aria-label={topic.is_pinned ? 'Unpin topic' : 'Pin topic'}
                      onClick={() => handleTogglePin(topic)}
                    >
                      <Pin
                        className={
                          topic.is_pinned ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'
                        }
                        aria-hidden="true"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busyId === topic.id}
                      aria-label={topic.is_favorite ? 'Remove favorite' : 'Favorite topic'}
                      onClick={() => handleToggleFavorite(topic)}
                    >
                      <Star
                        className={
                          topic.is_favorite
                            ? 'h-4 w-4 fill-accent text-accent'
                            : 'h-4 w-4 text-muted-foreground'
                        }
                        aria-hidden="true"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busyId === topic.id}
                      aria-label="Duplicate topic"
                      onClick={() => handleDuplicate(topic)}
                    >
                      <Copy className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Export topic configuration"
                      onClick={() => handleExportConfig(topic)}
                    >
                      <Download className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busyId === topic.id}
                      aria-label={topic.status === 'active' ? 'Archive topic' : 'Restore topic'}
                      onClick={() => handleArchiveToggle(topic)}
                    >
                      {topic.status === 'active' ? (
                        <Archive className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      ) : (
                        <ArchiveRestore className="h-4 w-4 text-success" aria-hidden="true" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busyId === topic.id}
                      aria-label="Delete topic"
                      onClick={() => setDeleteTarget(topic)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                  <Link
                    href={`/topics/${topic.slug}`}
                    className="inline-flex min-h-9 items-center rounded-md bg-muted px-3 text-xs font-medium text-foreground hover:bg-muted/80"
                  >
                    Open
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent
          title="Delete topic?"
          description={`Are you sure you want to delete "${deleteTarget?.name}"? You can archive it instead to preserve history.`}
        >
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={Boolean(busyId)}>
              Delete Topic
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
