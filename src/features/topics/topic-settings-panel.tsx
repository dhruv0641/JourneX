'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Archive, ArchiveRestore, ArrowDown, ArrowUp, Copy, Plus, Save } from 'lucide-react';
import { ConflictBanner } from '@/components/shared/state-views';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, NativeSelect } from '@/components/ui/input';
import {
  ALL_CUSTOM_FIELD_TYPES,
  FEATURE_REGISTRY,
  getFeatureList,
} from '@/engine/feature-registry/registry';
import type { CustomFieldDraft, FeatureKey, ViewType } from '@/engine/feature-registry/types';
import { createClient } from '@/lib/supabase/client';
import { createIdempotencyKey, toFieldKey } from '@/lib/utilities/csv';
import { AppConflictError } from '@/lib/validation/common';
import {
  addTopicModule,
  archiveModuleField,
  duplicateTopicAtomic,
  saveTopicViews,
  updateTopicModuleWithVersion,
  updateTopicWithVersion,
  upsertModuleField,
} from '@/services/topics.service';
import { useUiStore } from '@/stores/ui-store';
import type { TopicDetailBundle } from '@/services/topics.service';

export function TopicSettingsPanel({
  userId,
  bundle,
  onReload,
}: {
  userId: string;
  bundle: TopicDetailBundle;
  onReload: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [topicName, setTopicName] = useState(bundle.topic.name);
  const [topicDesc, setTopicDesc] = useState(bundle.topic.description);
  const [accentColor, setAccentColor] = useState(bundle.topic.accent_color);
  const [savingMeta, setSavingMeta] = useState(false);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  const [newFeatureKey, setNewFeatureKey] = useState<FeatureKey>('tasks');
  const [newModName, setNewModName] = useState('');
  const [addingModule, setAddingModule] = useState(false);

  const [selectedFieldModId, setSelectedFieldModId] = useState(
    bundle.modules.find((m) =>
      ['custom_tables', 'custom_forms', 'lists', 'expense_tracking'].includes(m.feature_key),
    )?.id ?? '',
  );
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldDraft['field_type']>('short_text');

  const [viewsDraft, setViewsDraft] = useState(
    bundle.views.map((v) => ({
      id: v.id,
      view_type: v.view_type as ViewType,
      name: v.name,
      sort_order: v.sort_order,
      is_default: v.is_default,
    })),
  );

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['topics'] }),
      queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] }),
      queryClient.invalidateQueries({ queryKey: ['topic-detail', bundle.topic.slug] }),
    ]);
    onReload();
  }

  async function handleSaveMeta(e: React.FormEvent) {
    e.preventDefault();
    setSavingMeta(true);
    setConflictMsg(null);
    try {
      await updateTopicWithVersion(
        createClient(),
        userId,
        bundle.topic.id,
        {
          name: topicName.trim(),
          description: topicDesc.trim(),
          accent_color: accentColor,
        },
        bundle.topic.version,
      );
      await refresh();
      pushToast({ kind: 'success', title: 'Topic settings saved' });
    } catch (err) {
      if (err instanceof AppConflictError) {
        setConflictMsg(err.message);
      } else {
        pushToast({ kind: 'error', title: 'Update failed' });
      }
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleToggleModule(modId: string, currentEnabled: boolean, version: number) {
    try {
      await updateTopicModuleWithVersion(
        createClient(),
        userId,
        modId,
        { is_enabled: !currentEnabled },
        version,
      );
      await refresh();
      pushToast({
        kind: 'info',
        title: currentEnabled ? 'Module disabled (existing data preserved)' : 'Module enabled',
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Module update failed',
        description: err instanceof Error ? err.message : 'Reload and retry.',
      });
    }
  }

  async function handleAddModule(e: React.FormEvent) {
    e.preventDefault();
    setAddingModule(true);
    try {
      const def = FEATURE_REGISTRY[newFeatureKey];
      const existingCount = bundle.modules.filter((m) => m.feature_key === newFeatureKey).length;
      const modKey =
        existingCount === 0 ? newFeatureKey : `${newFeatureKey}_${Date.now().toString(36)}`;
      await addTopicModule(createClient(), userId, bundle.topic.id, {
        feature_key: newFeatureKey,
        module_key: modKey,
        name: newModName.trim() || def.name,
        icon: def.icon,
        sort_order: bundle.modules.length,
        config: { ...def.defaultConfig },
      });
      setNewModName('');
      await refresh();
      pushToast({ kind: 'success', title: `Added ${newModName.trim() || def.name}` });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Failed to add module',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    } finally {
      setAddingModule(false);
    }
  }

  return (
    <div className="space-y-6">
      {conflictMsg ? <ConflictBanner message={conflictMsg} onReload={onReload} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Topic Identity &amp; Lifecycle</CardTitle>
            <CardDescription>
              Edit topic metadata, duplicate configuration, or archive/restore without losing records.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSaveMeta} className="space-y-3">
              <div className="space-y-1">
                <Label>Topic Name</Label>
                <Input value={topicName} onChange={(e) => setTopicName(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input value={topicDesc} onChange={(e) => setTopicDesc(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Accent Color</Label>
                <Input
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="w-32 font-mono text-xs"
                />
              </div>
              <Button type="submit" disabled={savingMeta}>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Changes
              </Button>
            </form>

            <div className="flex flex-wrap gap-2 border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const res = await duplicateTopicAtomic(
                    createClient(),
                    bundle.topic.id,
                    `${bundle.topic.name} (Copy)`,
                    createIdempotencyKey('dup'),
                  );
                  await refresh();
                  router.push(`/topics/${res.topic.slug}`);
                }}
              >
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                Duplicate Topic
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const nextStatus = bundle.topic.status === 'active' ? 'archived' : 'active';
                  await updateTopicWithVersion(
                    createClient(),
                    userId,
                    bundle.topic.id,
                    {
                      status: nextStatus,
                      archived_at: nextStatus === 'archived' ? new Date().toISOString() : null,
                    },
                    bundle.topic.version,
                  );
                  await refresh();
                }}
              >
                {bundle.topic.status === 'active' ? (
                  <>
                    <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                    Archive Topic
                  </>
                ) : (
                  <>
                    <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" />
                    Restore Topic
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add or Toggle Modules</CardTitle>
            <CardDescription>
              Disabling a module hides it from active tabs without deleting any underlying rows.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleAddModule} className="flex flex-col gap-2 sm:flex-row">
              <NativeSelect
                aria-label="Choose module type"
                value={newFeatureKey}
                onChange={(e) => setNewFeatureKey(e.target.value as FeatureKey)}
                className="sm:w-44"
              >
                {getFeatureList().map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.name}
                  </option>
                ))}
              </NativeSelect>
              <Input
                value={newModName}
                onChange={(e) => setNewModName(e.target.value)}
                placeholder="Custom module title…"
                className="flex-1"
              />
              <Button type="submit" disabled={addingModule}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </Button>
            </form>

            <div className="space-y-2">
              {bundle.modules.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{m.name}</span>
                    <Badge variant="outline">{m.feature_key}</Badge>
                  </div>
                  <Button
                    variant={m.is_enabled ? 'outline' : 'default'}
                    size="sm"
                    onClick={() => void handleToggleModule(m.id, m.is_enabled, m.version)}
                  >
                    {m.is_enabled ? 'Disable' : 'Enable'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Custom Fields Editor */}
      {selectedFieldModId ? (
        <Card>
          <CardHeader>
            <CardTitle>Custom Table &amp; Form Fields</CardTitle>
            <CardDescription>
              Stable field keys protect existing records when labels change. Archiving a field hides it without erasing historical values.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <NativeSelect
                aria-label="Target custom module"
                value={selectedFieldModId}
                onChange={(e) => setSelectedFieldModId(e.target.value)}
                className="sm:w-64"
              >
                {bundle.modules
                  .filter((m) =>
                    ['custom_tables', 'custom_forms', 'lists', 'expense_tracking'].includes(m.feature_key),
                  )
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
              </NativeSelect>
              <Input
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="New field label…"
                className="flex-1"
              />
              <NativeSelect
                aria-label="New field type"
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value as CustomFieldDraft['field_type'])}
                className="sm:w-40"
              >
                {ALL_CUSTOM_FIELD_TYPES.map((ft) => (
                  <option key={ft} value={ft}>
                    {ft.replace(/_/g, ' ')}
                  </option>
                ))}
              </NativeSelect>
              <Button
                onClick={async () => {
                  if (!newFieldLabel.trim()) return;
                  await upsertModuleField(
                    createClient(),
                    userId,
                    bundle.topic.id,
                    selectedFieldModId,
                    {
                      field_key: toFieldKey(newFieldLabel),
                      label: newFieldLabel.trim(),
                      field_type: newFieldType,
                      is_required: false,
                      sort_order: bundle.fields.filter((f) => f.module_id === selectedFieldModId).length,
                    },
                  );
                  setNewFieldLabel('');
                  await refresh();
                  pushToast({ kind: 'success', title: 'Custom field added' });
                }}
              >
                Add Field
              </Button>
            </div>

            <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs text-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
              Archiving a field preserves stored JSONB values in historical records while removing it from new forms.
            </div>

            <div className="space-y-1.5">
              {bundle.fields
                .filter((f) => f.module_id === selectedFieldModId)
                .map((f) => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-xs"
                  >
                    <div>
                      <span className="font-semibold">{f.label}</span>{' '}
                      <span className="font-mono text-muted-foreground">({f.field_key})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{f.field_type}</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          await archiveModuleField(createClient(), userId, f.id);
                          await refresh();
                        }}
                      >
                        Archive
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* View Ordering */}
      <Card>
        <CardHeader>
          <CardTitle>View Tabs &amp; Ordering</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {viewsDraft.map((v, idx) => (
            <div key={v.id} className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{v.view_type}</Badge>
                <Input
                  value={v.name}
                  onChange={(e) =>
                    setViewsDraft((prev) =>
                      prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                    )
                  }
                  className="w-44"
                />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={idx === 0}
                  aria-label="Move view up"
                  onClick={() =>
                    setViewsDraft((prev) => {
                      const copy = [...prev];
                      const [item] = copy.splice(idx, 1);
                      if (item) copy.splice(idx - 1, 0, item);
                      return copy;
                    })
                  }
                >
                  <ArrowUp className="h-4 w-4" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={idx === viewsDraft.length - 1}
                  aria-label="Move view down"
                  onClick={() =>
                    setViewsDraft((prev) => {
                      const copy = [...prev];
                      const [item] = copy.splice(idx, 1);
                      if (item) copy.splice(idx + 1, 0, item);
                      return copy;
                    })
                  }
                >
                  <ArrowDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
          <Button
            onClick={async () => {
              await saveTopicViews(createClient(), userId, bundle.topic.id, viewsDraft);
              await refresh();
              pushToast({ kind: 'success', title: 'Topic views saved' });
            }}
          >
            Save View Order
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
