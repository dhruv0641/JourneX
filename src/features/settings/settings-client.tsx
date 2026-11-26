'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from 'next-themes';
import { Download, Loader2, Save, Upload } from 'lucide-react';
import { ConflictBanner } from '@/components/shared/state-views';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, NativeSelect } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { createIdempotencyKey } from '@/lib/utilities/csv';
import { AppConflictError } from '@/lib/validation/common';
import { exportWorkspaceBundle } from '@/services/modules.service';
import { createTopicAtomic, type CreateTopicPayload } from '@/services/topics.service';
import {
  updatePreferencesWithVersion,
  updateProfileWithVersion,
} from '@/services/workspace.service';
import { useUiStore } from '@/stores/ui-store';
import type { ProfileRow, UserPreferencesRow } from '@/types/domain';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function SettingsClient({
  userId,
  email,
  initialProfile,
  initialPreferences,
}: {
  userId: string;
  email: string;
  initialProfile: ProfileRow | null;
  initialPreferences: UserPreferencesRow | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { setTheme } = useTheme();
  const pushToast = useUiStore((s) => s.pushToast);

  const [fullName, setFullName] = useState(initialProfile?.full_name ?? '');
  const [timezone, setTimezone] = useState(initialProfile?.timezone ?? 'UTC');
  const [profileVersion, setProfileVersion] = useState(initialProfile?.version ?? 1);

  const [appName, setAppName] = useState(initialPreferences?.app_name ?? 'NEXORA');
  const [themePref, setThemePref] = useState(initialPreferences?.theme ?? 'system');
  const [timeFormat, setTimeFormat] = useState(initialPreferences?.time_format ?? '24h');
  const [defaultRange, setDefaultRange] = useState(
    initialPreferences?.default_dashboard_range ?? '30d',
  );
  const [prefsVersion, setPrefsVersion] = useState(initialPreferences?.version ?? 1);

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setConflictMsg(null);
    const supabase = createClient();

    try {
      const [updatedProfile, updatedPrefs] = await Promise.all([
        updateProfileWithVersion(
          supabase,
          userId,
          { full_name: fullName.trim(), timezone },
          profileVersion,
        ),
        updatePreferencesWithVersion(
          supabase,
          userId,
          {
            app_name: appName.trim() || 'NEXORA',
            theme: themePref,
            time_format: timeFormat,
            default_dashboard_range: defaultRange,
          },
          prefsVersion,
        ),
      ]);

      setProfileVersion(updatedProfile.version);
      setPrefsVersion(updatedPrefs.version);
      setTheme(themePref);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ]);
      pushToast({ kind: 'success', title: 'Workspace settings saved' });
      router.refresh();
    } catch (err) {
      if (err instanceof AppConflictError) {
        setConflictMsg(err.message);
      } else {
        pushToast({
          kind: 'error',
          title: 'Failed to save settings',
          description: err instanceof Error ? err.message : 'Unexpected error',
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleExportFullJson() {
    setExporting(true);
    try {
      const bundle = await exportWorkspaceBundle(createClient(), userId);
      const blob = new Blob([JSON.stringify(bundle, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${appName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast({ kind: 'success', title: 'Workspace backup exported' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Export failed',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleImportTopicConfig(file: File | undefined) {
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<CreateTopicPayload>;
      if (!parsed.name || !Array.isArray(parsed.modules)) {
        throw new Error('Invalid topic configuration JSON: missing "name" or "modules".');
      }
      const created = await createTopicAtomic(
        createClient(),
        {
          name: parsed.name,
          description: parsed.description ?? '',
          purpose: parsed.purpose ?? '',
          category: parsed.category ?? 'custom',
          icon: parsed.icon ?? 'layers',
          accent_color: parsed.accent_color ?? '#2563EB',
          modules: parsed.modules,
          views: Array.isArray(parsed.views)
            ? parsed.views
            : [{ view_type: 'dashboard', name: 'Overview', sort_order: 0, is_default: true }],
        },
        createIdempotencyKey('import_topic'),
      );
      await queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] });
      pushToast({
        kind: 'success',
        title: 'Topic configuration imported',
        description: `Created "${created.topic.name}".`,
      });
      router.push(`/topics/${created.topic.slug}`);
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Topic import failed',
        description: err instanceof Error ? err.message : 'Invalid JSON structure',
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile &amp; Workspace Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your operating system name, timezone, appearance, and full data portability.
        </p>
      </div>

      {conflictMsg ? (
        <ConflictBanner message={conflictMsg} onReload={() => window.location.reload()} />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Operating System Preferences</CardTitle>
            <CardDescription>
              Saved persistently in your PostgreSQL workspace profile and preferences.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="appName">Application Name</Label>
                  <Input
                    id="appName"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    maxLength={40}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Owner Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="emailField">Account Email</Label>
                  <Input id="emailField" value={email} disabled />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timezone">Timezone</Label>
                  <NativeSelect
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="themePref">Theme</Label>
                  <NativeSelect
                    id="themePref"
                    value={themePref}
                    onChange={(e) => setThemePref(e.target.value)}
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="timeFormat">Time Format</Label>
                  <NativeSelect
                    id="timeFormat"
                    value={timeFormat}
                    onChange={(e) => setTimeFormat(e.target.value)}
                  >
                    <option value="24h">24-hour</option>
                    <option value="12h">12-hour</option>
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="defaultRange">Default Analytics Range</Label>
                  <NativeSelect
                    id="defaultRange"
                    value={defaultRange}
                    onChange={(e) => setDefaultRange(e.target.value)}
                  >
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="90d">Last 90 days</option>
                    <option value="all">All time</option>
                  </NativeSelect>
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden="true" />
                  )}
                  Save Settings
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Portability &amp; Recovery</CardTitle>
            <CardDescription>
              Export all your workspace data or import a topic JSON blueprint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleExportFullJson}
              disabled={exporting}
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-4 w-4" aria-hidden="true" />
              )}
              Export Full Workspace JSON
            </Button>

            <div className="rounded-lg border border-dashed border-border p-4">
              <Label htmlFor="topicImportFile" className="mb-2">
                Import Topic Configuration (JSON)
              </Label>
              <label
                htmlFor="topicImportFile"
                className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-muted/50 px-3 text-xs font-medium hover:bg-muted"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                {importing ? 'Importing…' : 'Choose Topic JSON File'}
              </label>
              <input
                id="topicImportFile"
                type="file"
                accept="application/json,.json"
                className="sr-only"
                disabled={importing}
                onChange={(e) => void handleImportTopicConfig(e.target.files?.[0])}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
