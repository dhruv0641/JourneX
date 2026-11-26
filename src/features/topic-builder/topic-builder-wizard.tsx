'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  CopyPlus,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { TopicIcon, AVAILABLE_TOPIC_ICONS } from '@/components/shared/topic-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, NativeSelect, Textarea } from '@/components/ui/input';
import { validateFormula } from '@/engine/formula-engine/evaluator';
import {
  ALL_CUSTOM_FIELD_TYPES,
  ALL_VIEW_TYPES,
  FEATURE_REGISTRY,
  getFeatureList,
  getSupportedViewsForModules,
} from '@/engine/feature-registry/registry';
import type { CustomFieldDraft, FeatureKey, ViewType } from '@/engine/feature-registry/types';
import { discoverTopicRequirements } from '@/engine/template-engine/intent-matcher';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utilities/cn';
import { createIdempotencyKey, toFieldKey, toSlug } from '@/lib/utilities/csv';
import { createTopicAtomic, type CreateTopicModuleInput } from '@/services/topics.service';
import { useUiStore } from '@/stores/ui-store';
import type { TopicTemplateRow } from '@/types/domain';

const ACCENT_PRESETS = [
  '#643450',
  '#496F61',
  '#776399',
  '#896022',
  '#A63448',
  '#426A81',
  '#336648',
  '#695A60',
];

const CATEGORIES = [
  'general',
  'education',
  'engineering',
  'finance',
  'productivity',
  'health',
  'business',
  'career',
  'computation',
];

const STEPS = [
  { id: 1, label: 'Identity' },
  { id: 2, label: 'Discovery' },
  { id: 3, label: 'Modules' },
  { id: 4, label: 'Configure' },
  { id: 5, label: 'Views' },
  { id: 6, label: 'Preview' },
];

interface CalcDraft {
  name: string;
  description: string;
  inputs: Array<{ key: string; label: string; type: string; unit: string; defaultValue: number }>;
  outputs: Array<{
    key: string;
    label: string;
    unit: string;
    precision: number;
    monetary?: boolean;
  }>;
  formulas: Array<{ key: string; expression: string; precision: number; monetary?: boolean }>;
}

const DEFAULT_CALC_DRAFT: CalcDraft = {
  name: 'Custom Formula Calculator',
  description: 'Computes custom outputs from validated inputs',
  inputs: [
    { key: 'input_a', label: 'Value A', type: 'decimal', unit: '', defaultValue: 10 },
    { key: 'input_b', label: 'Value B', type: 'decimal', unit: '', defaultValue: 5 },
  ],
  outputs: [{ key: 'result', label: 'Result', unit: '', precision: 2 }],
  formulas: [{ key: 'result', expression: 'input_a + input_b', precision: 2 }],
};

export function TopicBuilderWizard({ templates }: { templates: TopicTemplateRow[] }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [step, setStep] = useState(1);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [purpose, setPurpose] = useState('');
  const [category, setCategory] = useState('general');
  const [icon, setIcon] = useState('layers');
  const [accentColor, setAccentColor] = useState(ACCENT_PRESETS[0]!);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const [modules, setModules] = useState<CreateTopicModuleInput[]>([
    {
      feature_key: 'tasks',
      module_key: 'tasks',
      name: 'Tasks',
      icon: 'check-square',
      sort_order: 0,
      config: { ...FEATURE_REGISTRY.tasks.defaultConfig },
    },
  ]);

  const [views, setViews] = useState<
    Array<{ view_type: ViewType; name: string; is_default: boolean }>
  >([
    { view_type: 'dashboard', name: 'Overview', is_default: true },
    { view_type: 'list', name: 'Tasks', is_default: false },
  ]);

  const [idempotencyKey] = useState(() => createIdempotencyKey('topic'));
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );

  const discovery = useMemo(
    () =>
      discoverTopicRequirements({
        name: name || 'Untitled Topic',
        description,
        purpose,
        category,
        selectedTemplateSlug: selectedTemplate?.slug ?? null,
      }),
    [name, description, purpose, category, selectedTemplate],
  );

  const supportedViews = useMemo(
    () => getSupportedViewsForModules(modules.map((m) => m.feature_key)),
    [modules],
  );

  function applyTemplate(tpl: TopicTemplateRow) {
    setSelectedTemplateId(tpl.id);
    if (!name.trim()) setName(tpl.name === 'Blank Modular Topic' ? '' : tpl.name);
    if (!description.trim()) setDescription(tpl.description);
    setCategory(tpl.category);
    setIcon(tpl.icon);
    setAccentColor(tpl.accent_color);

    const def = tpl.definition as {
      modules?: CreateTopicModuleInput[];
      views?: Array<{ view_type: ViewType; name: string; is_default: boolean }>;
    };

    if (Array.isArray(def.modules)) {
      setModules(
        def.modules.map((m, idx) => ({
          ...m,
          sort_order: idx,
          config: m.config ?? { ...FEATURE_REGISTRY[m.feature_key]?.defaultConfig },
          fields: m.fields ?? [],
        })),
      );
    }
    if (Array.isArray(def.views) && def.views.length > 0) {
      setViews(def.views);
    } else {
      setViews([{ view_type: 'dashboard', name: 'Overview', is_default: true }]);
    }
  }

  function applyDiscoveryRecommendations() {
    const matchedTemplate = templates.find((t) => t.slug === discovery.recommendedTemplateSlug);
    const activeTemplate =
      selectedTemplate && selectedTemplate.slug !== 'blank-topic'
        ? selectedTemplate
        : matchedTemplate && discovery.confidence !== 'low'
          ? matchedTemplate
          : undefined;

    if (activeTemplate && !selectedTemplateId) {
      setSelectedTemplateId(activeTemplate.id);
    }

    const templateDef = activeTemplate?.definition as
      | {
          modules?: CreateTopicModuleInput[];
          views?: Array<{ view_type: ViewType; name: string; is_default: boolean }>;
        }
      | undefined;
    const templateModules = Array.isArray(templateDef?.modules) ? templateDef.modules : [];

    const mergedKeys = Array.from(
      new Set<FeatureKey>([...modules.map((m) => m.feature_key), ...discovery.recommendedModules]),
    );

    const builtModules: CreateTopicModuleInput[] = mergedKeys.map((fkey, idx) => {
      const existingMod = modules.find((m) => m.feature_key === fkey);
      const tplMod = templateModules.find((m) => m.feature_key === fkey);
      const reg = FEATURE_REGISTRY[fkey];

      if (
        existingMod &&
        (existingMod.fields?.length ||
          Object.keys(existingMod.config ?? {}).length ||
          activeTemplate)
      ) {
        return { ...existingMod, sort_order: idx };
      }

      if (tplMod) {
        return {
          ...tplMod,
          sort_order: idx,
          config: tplMod.config ?? { ...reg.defaultConfig },
          fields: tplMod.fields ?? [],
        };
      }

      const recFields = discovery.recommendedFields[fkey] ?? [];
      const config: Record<string, unknown> = { ...reg.defaultConfig };
      if (fkey === 'calculators' && discovery.suggestedCalculator) {
        config.calculator = discovery.suggestedCalculator;
      } else if (fkey === 'calculators') {
        config.calculator = {
          name: DEFAULT_CALC_DRAFT.name,
          description: DEFAULT_CALC_DRAFT.description,
          inputs_schema: DEFAULT_CALC_DRAFT.inputs,
          outputs_schema: DEFAULT_CALC_DRAFT.outputs,
          formulas: DEFAULT_CALC_DRAFT.formulas,
        };
      }
      return {
        feature_key: fkey,
        module_key: fkey,
        name: reg.name,
        icon: reg.icon,
        sort_order: idx,
        config,
        fields: recFields,
      };
    });

    setModules(builtModules);
    if (Array.isArray(templateDef?.views) && templateDef.views.length > 0) {
      setViews(templateDef.views);
    } else {
      setViews(discovery.recommendedViews);
    }
    pushToast({
      kind: 'info',
      title: 'Recommendations applied',
      description: `Configured ${builtModules.length} modules and ${
        Array.isArray(templateDef?.views) && templateDef.views.length > 0
          ? templateDef.views.length
          : discovery.recommendedViews.length
      } views.`,
    });
  }

  function toggleFeatureModule(fkey: FeatureKey) {
    const exists = modules.some((m) => m.feature_key === fkey);
    if (exists) {
      setModules((prev) => prev.filter((m) => m.feature_key !== fkey));
      return;
    }
    addModuleInstance(fkey);
  }

  function addModuleInstance(fkey: FeatureKey) {
    const reg = FEATURE_REGISTRY[fkey];
    const count = modules.filter((m) => m.feature_key === fkey).length;
    const moduleKey = count === 0 ? fkey : `${fkey}_${count + 1}`;
    const moduleName = count === 0 ? reg.name : `${reg.name} ${count + 1}`;
    const config: Record<string, unknown> = { ...reg.defaultConfig };
    if (fkey === 'calculators') {
      config.calculator = {
        name: `${moduleName}`,
        description: '',
        inputs_schema: DEFAULT_CALC_DRAFT.inputs,
        outputs_schema: DEFAULT_CALC_DRAFT.outputs,
        formulas: DEFAULT_CALC_DRAFT.formulas,
      };
    }

    const defaultFields: CustomFieldDraft[] =
      fkey === 'expense_tracking'
        ? [
            {
              field_key: 'entry_type',
              label: 'Type',
              field_type: 'dropdown',
              is_required: true,
              options: ['income', 'expense'],
              sort_order: 0,
            },
            {
              field_key: 'amount',
              label: 'Amount',
              field_type: 'currency',
              is_required: true,
              validation_rules: { min: 0 },
              sort_order: 1,
            },
            {
              field_key: 'category',
              label: 'Category',
              field_type: 'short_text',
              is_required: true,
              sort_order: 2,
            },
          ]
        : fkey === 'custom_tables' || fkey === 'custom_forms' || fkey === 'lists'
          ? [
              {
                field_key: 'item_name',
                label: 'Item',
                field_type: 'short_text',
                is_required: true,
                sort_order: 0,
              },
              {
                field_key: 'value',
                label: 'Value',
                field_type: 'decimal',
                is_required: false,
                sort_order: 1,
              },
            ]
          : [];

    setModules((prev) => [
      ...prev,
      {
        feature_key: fkey,
        module_key: moduleKey,
        name: moduleName,
        icon: reg.icon,
        sort_order: prev.length,
        config,
        fields: defaultFields,
      },
    ]);
  }

  function updateModuleConfig(moduleKey: string, configKey: string, value: unknown) {
    setModules((prev) =>
      prev.map((m) =>
        m.module_key === moduleKey
          ? { ...m, config: { ...(m.config ?? {}), [configKey]: value } }
          : m,
      ),
    );
  }

  function updateModuleFields(moduleKey: string, fields: CustomFieldDraft[]) {
    setModules((prev) => prev.map((m) => (m.module_key === moduleKey ? { ...m, fields } : m)));
  }

  function updateCalculatorConfig(moduleKey: string, calc: Record<string, unknown>) {
    setModules((prev) =>
      prev.map((m) =>
        m.module_key === moduleKey
          ? { ...m, config: { ...(m.config ?? {}), calculator: calc } }
          : m,
      ),
    );
  }

  function validateStep(targetStep: number): string | null {
    if (targetStep >= 2 && name.trim().length < 1) {
      return 'Enter a topic name before continuing.';
    }
    if (targetStep >= 4 && modules.length === 0) {
      return 'Select at least one module so your topic has active functionality.';
    }
    if (targetStep >= 6) {
      for (const mod of modules) {
        if (mod.feature_key === 'calculators') {
          const calc = (mod.config?.calculator ?? {}) as {
            inputs_schema?: Array<{ key: string }>;
            formulas?: Array<{ key: string; expression: string }>;
          };
          const allowedIds = new Set([
            ...(calc.inputs_schema ?? []).map((i) => i.key),
            ...(calc.formulas ?? []).map((f) => f.key),
          ]);
          for (const f of calc.formulas ?? []) {
            try {
              validateFormula(f.expression, allowedIds);
            } catch (err) {
              return `Calculator "${mod.name}" formula "${f.key}" error: ${err instanceof Error ? err.message : 'Invalid formula'}`;
            }
          }
        }
      }
      if (views.length === 0) {
        return 'Enable at least one view for this topic.';
      }
    }
    return null;
  }

  function goToStep(next: number) {
    if (next > step) {
      const err = validateStep(next);
      if (err) {
        setValidationError(err);
        requestAnimationFrame(() => document.getElementById('builder-error')?.focus());
        return;
      }
    }
    setValidationError(null);
    setStep(next);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  async function handlePublish() {
    const err = validateStep(6);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    setSubmitting(true);

    try {
      const normalizedViews = views.map((v, idx) => ({
        ...v,
        sort_order: idx,
        is_default: views.some((x) => x.is_default) ? v.is_default : idx === 0,
      }));

      const result = await createTopicAtomic(
        createClient(),
        {
          name: name.trim(),
          slug: toSlug(name.trim()),
          description: description.trim(),
          purpose: purpose.trim(),
          category,
          icon,
          accent_color: accentColor,
          template_id: selectedTemplateId || null,
          modules: modules.map((m, idx) => ({ ...m, sort_order: idx })),
          views: normalizedViews,
        },
        idempotencyKey,
      );

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['workspace-bootstrap'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
      ]);
      pushToast({
        kind: 'success',
        title: `Created "${result.topic.name}"`,
        description: 'Topic, modules, fields, and views saved atomically.',
      });
      router.push(`/topics/${result.topic.slug}`);
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : 'Failed to create topic');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="scroll-mt-24 font-serif text-3xl tracking-tight outline-none sm:text-4xl"
          >
            Dynamic Topic Builder
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Name your topic, choose its tools, and preview it before creating it.
          </p>
        </div>
        <label className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 sm:hidden">
          <span className="text-sm font-semibold">
            Step {step} of {STEPS.length}
          </span>
          <NativeSelect
            aria-label="Builder step"
            className="w-auto min-w-0 flex-1"
            value={step}
            disabled={submitting}
            onChange={(event) => goToStep(Number(event.target.value))}
          >
            {STEPS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        <nav aria-label="Builder steps" className="hidden flex-wrap items-center gap-1.5 sm:flex">
          {STEPS.map((s) => (
            <button
              key={s.id}
              type="button"
              disabled={submitting}
              aria-current={step === s.id ? 'step' : undefined}
              onClick={() => goToStep(s.id)}
              className={cn(
                'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors',
                step === s.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : s.id < step
                    ? 'border-border bg-card text-foreground'
                    : 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              <span className="tabular-nums">{s.id}.</span>
              <span>{s.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {validationError ? (
        <div
          role="alert"
          id="builder-error"
          tabIndex={-1}
          className="scroll-mt-24 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {validationError}
        </div>
      ) : null}

      {/* STEP 1: Identity & Template */}
      {step === 1 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Step 1 — Topic Identity</CardTitle>
              <CardDescription>
                Define the topic name, purpose, visual identity, and optional starter template.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="topicName">Topic Name</Label>
                  <Input
                    id="topicName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., IELTS Preparation, AI Engineering, Personal Finance…"
                    maxLength={100}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="topicCategory">Category</Label>
                  <NativeSelect
                    id="topicCategory"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="topicAccent">Accent Color</Label>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {ACCENT_PRESETS.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        aria-pressed={accentColor.toUpperCase() === hex}
                        aria-label={`Select accent color ${hex}`}
                        onClick={() => setAccentColor(hex)}
                        className={cn(
                          'size-11 cursor-pointer rounded-full border-2 motion-safe:transition-transform',
                          accentColor.toUpperCase() === hex
                            ? 'scale-110 border-foreground'
                            : 'border-transparent',
                        )}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                    <Input
                      id="topicAccent"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-24 font-mono text-xs"
                      aria-label="Custom hex color"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="topicDescription">
                    What do you want to track or manage here? (Optional natural-language intent)
                  </Label>
                  <Textarea
                    id="topicDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g., Log daily IELTS reading/listening practice scores, track study hours, calculate overall band score, and write reflections…"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="topicPurpose">Topic Purpose / Target Outcome</Label>
                  <Input
                    id="topicPurpose"
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    placeholder="e.g., Achieve Band 8.0 before September…"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Icon</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {AVAILABLE_TOPIC_ICONS.slice(0, 18).map((iconKey) => (
                      <button
                        key={iconKey}
                        type="button"
                        aria-pressed={icon === iconKey}
                        aria-label={`Icon ${iconKey}`}
                        onClick={() => setIcon(iconKey)}
                        className={cn(
                          'flex size-11 cursor-pointer items-center justify-center rounded-md border transition-colors',
                          icon === iconKey
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted',
                        )}
                      >
                        <TopicIcon name={iconKey} className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Starter Templates</CardTitle>
              <CardDescription>
                Start with a curated blueprint or build from a blank slate.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => applyTemplate(tpl)}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                    selectedTemplateId === tpl.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:bg-muted/50',
                  )}
                >
                  <span
                    className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
                    style={{ backgroundColor: tpl.accent_color }}
                  >
                    <TopicIcon name={tpl.icon} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{tpl.name}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {tpl.description}
                    </p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* STEP 2: Intelligent Requirement Discovery */}
      {step === 2 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              Step 2 — Suggested setup
            </CardTitle>
            <CardDescription>
              Review the tools suggested for your topic. You can adjust them in the next step.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-border bg-muted/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      discovery.confidence === 'high'
                        ? 'success'
                        : discovery.confidence === 'medium'
                          ? 'primary'
                          : 'outline'
                    }
                  >
                    Confidence: {discovery.confidence}
                  </Badge>
                  {discovery.matchedProfile ? (
                    <span className="text-sm font-semibold">{discovery.matchedProfile}</span>
                  ) : (
                    <span className="text-sm font-semibold">Generic Modular Workspace</span>
                  )}
                </div>
                <Button onClick={applyDiscoveryRecommendations}>Apply Recommended Setup</Button>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{discovery.explanation}</p>
              {discovery.detectedKeywords.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {discovery.detectedKeywords.map((kw) => (
                    <Badge key={kw} variant="default">
                      {kw}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold">Recommended Modules</h3>
              <div className="flex flex-wrap gap-2">
                {discovery.recommendedModules.map((fk) => (
                  <Badge key={fk} variant="primary">
                    {FEATURE_REGISTRY[fk].name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 3: Select Modules (Multi-Instance) */}
      {step === 3 ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Step 3 — Select Modules ({modules.length} enabled)</CardTitle>
              <CardDescription>
                Choose the tools you’ll use. Some modules can be added more than once.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <NativeSelect
                aria-label="Filter modules"
                className="sm:max-w-64"
                value={moduleFilter}
                onChange={(event) => setModuleFilter(event.target.value)}
              >
                <option value="all">All modules</option>
                <option value="recommended">Recommended for this topic</option>
                <option value="enabled">Enabled modules ({modules.length})</option>
              </NativeSelect>
              {moduleFilter === 'enabled' && modules.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No modules enabled. Choose “All modules” to add one.
                </p>
              )}
              {moduleFilter === 'recommended' && !discovery.recommendedModules.length && (
                <p className="text-sm text-muted-foreground">
                  No recommendations for this topic yet. Explore all modules to choose one.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {getFeatureList()
                  .filter((feat) => {
                    if (moduleFilter === 'recommended')
                      return discovery.recommendedModules.includes(feat.key);
                    if (moduleFilter === 'enabled')
                      return modules.some((mod) => mod.feature_key === feat.key);
                    return true;
                  })
                  .map((feat) => {
                    const count = modules.filter((m) => m.feature_key === feat.key).length;
                    const enabled = count > 0;
                    return (
                      <div
                        key={feat.key}
                        className={cn(
                          'flex flex-col justify-between rounded-lg border p-4 transition-colors',
                          enabled ? 'border-primary bg-primary/5' : 'border-border bg-card',
                        )}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-foreground">
                                <TopicIcon name={feat.icon} className="h-4 w-4" />
                              </span>
                              <div>
                                <h3 className="text-sm font-semibold">{feat.name}</h3>
                                <span className="text-[11px] capitalize text-muted-foreground">
                                  {feat.category}
                                </span>
                              </div>
                            </div>
                            {enabled ? <Badge variant="primary">{count}x</Badge> : null}
                          </div>
                          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                            {feat.description}
                          </p>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            variant={enabled ? 'outline' : 'default'}
                            size="sm"
                            className="flex-1"
                            onClick={() => toggleFeatureModule(feat.key)}
                          >
                            {enabled ? 'Remove' : 'Enable'}
                          </Button>
                          {enabled && feat.allowMultiple ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => addModuleInstance(feat.key)}
                              title={`Add another ${feat.name} instance`}
                            >
                              <CopyPlus className="h-3.5 w-3.5" aria-hidden="true" />
                              Add
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* STEP 4: Conditional Module Configuration, Custom Fields, and Calculator Formulas */}
      {step === 4 ? (
        <div className="space-y-4">
          {modules.map((mod) => {
            const def = FEATURE_REGISTRY[mod.feature_key];
            const supportsCustomFields =
              mod.feature_key === 'custom_tables' ||
              mod.feature_key === 'custom_forms' ||
              mod.feature_key === 'lists' ||
              mod.feature_key === 'expense_tracking';
            const calc = mod.config?.calculator as
              | {
                  name?: string;
                  inputs_schema?: Array<{
                    key: string;
                    label: string;
                    type: string;
                    unit?: string;
                    defaultValue: number;
                  }>;
                  outputs_schema?: Array<{
                    key: string;
                    label: string;
                    unit?: string;
                    precision: number;
                    monetary?: boolean;
                  }>;
                  formulas?: Array<{
                    key: string;
                    expression: string;
                    precision: number;
                    monetary?: boolean;
                  }>;
                }
              | undefined;

            return (
              <Card key={mod.module_key}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TopicIcon name={def.icon} className="h-4 w-4 text-primary" />
                      <CardTitle>{mod.name}</CardTitle>
                      <Badge variant="outline">{def.key}</Badge>
                    </div>
                    <Input
                      aria-label={`Rename ${mod.name}`}
                      value={mod.name}
                      onChange={(e) =>
                        setModules((prev) =>
                          prev.map((m) =>
                            m.module_key === mod.module_key ? { ...m, name: e.target.value } : m,
                          ),
                        )
                      }
                      className="w-56"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {def.questionnaire.length > 0 ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {def.questionnaire.map((q) => {
                        const val = mod.config?.[q.key] ?? q.defaultValue;
                        return (
                          <div key={q.key} className="space-y-1.5">
                            <Label htmlFor={`${mod.module_key}-${q.key}`}>{q.label}</Label>
                            {q.type === 'boolean' ? (
                              <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border border-input px-3 text-sm">
                                <input
                                  id={`${mod.module_key}-${q.key}`}
                                  type="checkbox"
                                  checked={Boolean(val)}
                                  onChange={(e) =>
                                    updateModuleConfig(mod.module_key, q.key, e.target.checked)
                                  }
                                />
                                <span>{Boolean(val) ? 'Enabled' : 'Disabled'}</span>
                              </label>
                            ) : q.type === 'select' ? (
                              <NativeSelect
                                id={`${mod.module_key}-${q.key}`}
                                value={String(val)}
                                onChange={(e) =>
                                  updateModuleConfig(mod.module_key, q.key, e.target.value)
                                }
                              >
                                {(q.options ?? []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </NativeSelect>
                            ) : q.type === 'number' ? (
                              <Input
                                id={`${mod.module_key}-${q.key}`}
                                type="number"
                                value={Number(val)}
                                onChange={(e) =>
                                  updateModuleConfig(mod.module_key, q.key, Number(e.target.value))
                                }
                              />
                            ) : (
                              <Input
                                id={`${mod.module_key}-${q.key}`}
                                value={String(val ?? '')}
                                onChange={(e) =>
                                  updateModuleConfig(mod.module_key, q.key, e.target.value)
                                }
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : null}

                  {supportsCustomFields ? (
                    <div className="space-y-3 border-t border-border pt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-semibold">Custom Fields Schema</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const existing = mod.fields ?? [];
                            const nextNum = existing.length + 1;
                            updateModuleFields(mod.module_key, [
                              ...existing,
                              {
                                field_key: `field_${nextNum}`,
                                label: `Field ${nextNum}`,
                                field_type: 'short_text',
                                is_required: false,
                                sort_order: existing.length,
                              },
                            ]);
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                          Add Field
                        </Button>
                      </div>
                      {(mod.fields ?? []).map((field, fIdx) => (
                        <div
                          key={`${field.field_key}-${fIdx}`}
                          className="grid gap-2 rounded-md border border-border p-3 sm:grid-cols-12"
                        >
                          <div className="sm:col-span-4">
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={field.label}
                              onChange={(e) => {
                                const updated = [...(mod.fields ?? [])];
                                const label = e.target.value;
                                updated[fIdx] = {
                                  ...field,
                                  label,
                                  field_key: toFieldKey(label, `field_${fIdx + 1}`),
                                };
                                updateModuleFields(mod.module_key, updated);
                              }}
                            />
                          </div>
                          <div className="sm:col-span-3">
                            <Label className="text-xs">Type</Label>
                            <NativeSelect
                              value={field.field_type}
                              onChange={(e) => {
                                const updated = [...(mod.fields ?? [])];
                                updated[fIdx] = {
                                  ...field,
                                  field_type: e.target.value as CustomFieldDraft['field_type'],
                                };
                                updateModuleFields(mod.module_key, updated);
                              }}
                            >
                              {ALL_CUSTOM_FIELD_TYPES.map((ft) => (
                                <option key={ft} value={ft}>
                                  {ft.replace(/_/g, ' ')}
                                </option>
                              ))}
                            </NativeSelect>
                          </div>
                          <div className="sm:col-span-3">
                            <Label className="text-xs">
                              {field.field_type === 'formula'
                                ? 'Formula'
                                : field.field_type === 'dropdown' ||
                                    field.field_type === 'multi_select'
                                  ? 'Options (comma-separated)'
                                  : 'Required'}
                            </Label>
                            {field.field_type === 'formula' ? (
                              <Input
                                value={field.formula_expression ?? ''}
                                placeholder="qty * price"
                                className="font-mono text-xs"
                                onChange={(e) => {
                                  const updated = [...(mod.fields ?? [])];
                                  updated[fIdx] = { ...field, formula_expression: e.target.value };
                                  updateModuleFields(mod.module_key, updated);
                                }}
                              />
                            ) : field.field_type === 'dropdown' ||
                              field.field_type === 'multi_select' ? (
                              <Input
                                value={(field.options ?? []).join(', ')}
                                placeholder="Option 1, Option 2"
                                onChange={(e) => {
                                  const updated = [...(mod.fields ?? [])];
                                  updated[fIdx] = {
                                    ...field,
                                    options: e.target.value
                                      .split(',')
                                      .map((x) => x.trim())
                                      .filter(Boolean),
                                  };
                                  updateModuleFields(mod.module_key, updated);
                                }}
                              />
                            ) : (
                              <label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs">
                                <input
                                  type="checkbox"
                                  checked={field.is_required}
                                  onChange={(e) => {
                                    const updated = [...(mod.fields ?? [])];
                                    updated[fIdx] = { ...field, is_required: e.target.checked };
                                    updateModuleFields(mod.module_key, updated);
                                  }}
                                />
                                Required
                              </label>
                            )}
                          </div>
                          <div className="flex items-end justify-end sm:col-span-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label="Remove field"
                              onClick={() => {
                                updateModuleFields(
                                  mod.module_key,
                                  (mod.fields ?? []).filter((_, idx) => idx !== fIdx),
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {mod.feature_key === 'calculators' && calc ? (
                    <div className="space-y-3 border-t border-border pt-4">
                      <h4 className="text-sm font-semibold">
                        Initial Calculator Formula Configuration
                      </h4>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Calculator Title</Label>
                          <Input
                            value={calc.name ?? mod.name}
                            onChange={(e) =>
                              updateCalculatorConfig(mod.module_key, {
                                ...calc,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">
                            Output Formula ({calc.outputs_schema?.[0]?.key ?? 'result'})
                          </Label>
                          <Input
                            className="font-mono text-xs"
                            value={calc.formulas?.[0]?.expression ?? 'input_a + input_b'}
                            onChange={(e) => {
                              const currentFormulas = [...(calc.formulas ?? [])];
                              if (currentFormulas[0]) {
                                currentFormulas[0] = {
                                  ...currentFormulas[0],
                                  expression: e.target.value,
                                };
                              }
                              updateCalculatorConfig(mod.module_key, {
                                ...calc,
                                formulas: currentFormulas,
                              });
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Inputs available: {(calc.inputs_schema ?? []).map((i) => i.key).join(', ')}.
                        You can add more inputs, outputs, and formula versions inside the topic
                        anytime.
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      {/* STEP 5: Views Configuration */}
      {step === 5 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 5 — Configure Topic Views</CardTitle>
            <CardDescription>
              Enable, rename, reorder, and pick the default landing view for this topic.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              {ALL_VIEW_TYPES.filter((v) => supportedViews.includes(v.type)).map((v) => {
                const active = views.some((x) => x.view_type === v.type);
                return (
                  <Button
                    key={v.type}
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      if (active) {
                        if (views.length > 1) {
                          setViews((prev) => prev.filter((x) => x.view_type !== v.type));
                        }
                      } else {
                        setViews((prev) => [
                          ...prev,
                          { view_type: v.type, name: v.label, is_default: false },
                        ]);
                      }
                    }}
                  >
                    {active ? (
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    )}
                    {v.label}
                  </Button>
                );
              })}
            </div>

            <div className="space-y-2">
              {views.map((view, idx) => (
                <div
                  key={view.view_type}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-background p-3"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{view.view_type}</Badge>
                    <Input
                      aria-label={`View label for ${view.view_type}`}
                      value={view.name}
                      onChange={(e) =>
                        setViews((prev) =>
                          prev.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)),
                        )
                      }
                      className="w-48"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant={view.is_default ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setViews((prev) => prev.map((x, i) => ({ ...x, is_default: i === idx })))
                      }
                    >
                      {view.is_default ? 'Default' : 'Set Default'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={idx === 0}
                      aria-label={`Move ${view.name} up`}
                      onClick={() =>
                        setViews((prev) => {
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
                      disabled={idx === views.length - 1}
                      aria-label={`Move ${view.name} down`}
                      onClick={() =>
                        setViews((prev) => {
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
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* STEP 6: Preview & Atomic Publish */}
      {step === 6 ? (
        <Card>
          <CardHeader>
            <CardTitle>Step 6 — Live Topic Preview &amp; Validation</CardTitle>
            <CardDescription>
              Review your complete topic blueprint before persisting atomically in Supabase.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-xl border border-border bg-background p-5">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  <TopicIcon name={icon} className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold">{name || 'Untitled Topic'}</h2>
                  <p className="text-xs text-muted-foreground">
                    /{toSlug(name || 'topic')} • {category}
                  </p>
                </div>
              </div>
              {description ? (
                <p className="mt-3 text-sm text-muted-foreground">{description}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border pt-3">
                {views.map((v) => (
                  <Badge key={v.view_type} variant={v.is_default ? 'primary' : 'outline'}>
                    {v.name} ({v.view_type})
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {modules.map((m) => (
                <div key={m.module_key} className="rounded-lg border border-border p-3.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{m.name}</span>
                    <Badge variant="default">{m.feature_key}</Badge>
                  </div>
                  {m.fields && m.fields.length > 0 ? (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {m.fields.length} fields: {m.fields.map((f) => f.label).join(', ')}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Wizard Footer Controls */}
      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-between gap-2 rounded-xl border border-border bg-card p-2 shadow-sm lg:bottom-3">
        <Button
          variant="outline"
          disabled={step === 1 || submitting}
          onClick={() => goToStep(step - 1)}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Button>

        {step < 6 ? (
          <Button onClick={() => goToStep(step + 1)}>
            Next Step
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button size="lg" disabled={submitting} onClick={handlePublish}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Creating Topic…
              </>
            ) : (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Create Topic
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
