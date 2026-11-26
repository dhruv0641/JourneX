'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Calculator, History, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import { AnalyticsChartCard } from '@/components/charts/analytics-charts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label, NativeSelect } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  evaluateFormulaSet,
  FormulaError,
  type FormulaDefinition,
} from '@/engine/formula-engine/evaluator';
import { createClient } from '@/lib/supabase/client';
import { toFieldKey } from '@/lib/utilities/csv';
import { formatDateTimeInZone } from '@/lib/utilities/dates';
import {
  createOrUpdateCalculator,
  listCalculatorHistory,
  saveCalculationRun,
} from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type {
  CalculatorDefinitionRow,
  CalculatorVersionRow,
  TopicModuleRow,
} from '@/types/domain';

interface InputFieldSchema {
  key: string;
  label: string;
  type: string;
  unit?: string;
  defaultValue: number;
  min?: number;
  max?: number;
}

interface OutputFieldSchema {
  key: string;
  label: string;
  unit?: string;
  precision: number;
  monetary?: boolean;
}

export function CalculatorsModule({
  userId,
  topicId,
  module: mod,
  calculators,
  versions,
  timezone,
  onReloadTopic,
}: {
  userId: string;
  topicId: string;
  module: TopicModuleRow;
  calculators: CalculatorDefinitionRow[];
  versions: CalculatorVersionRow[];
  timezone: string;
  onReloadTopic: () => void;
}) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const activeDef = calculators.find((c) => c.module_id === mod.id) ?? calculators[0];
  const calcVersions = useMemo(
    () =>
      activeDef
        ? versions
            .filter((v) => v.calculator_id === activeDef.id)
            .sort((a, b) => b.version_number - a.version_number)
        : [],
    [activeDef, versions],
  );
  const currentVersion = calcVersions[0];

  const parsedInputsSchema = useMemo(
    () =>
      ((currentVersion?.inputs_schema as unknown as InputFieldSchema[]) ?? [
        { key: 'a', label: 'Input A', type: 'decimal', unit: '', defaultValue: 10 },
        { key: 'b', label: 'Input B', type: 'decimal', unit: '', defaultValue: 2 },
      ]),
    [currentVersion],
  );
  const parsedOutputsSchema = useMemo(
    () =>
      ((currentVersion?.outputs_schema as unknown as OutputFieldSchema[]) ?? [
        { key: 'result', label: 'Result', unit: '', precision: 2 },
      ]),
    [currentVersion],
  );
  const parsedFormulas = useMemo(
    () =>
      ((currentVersion?.formulas as unknown as FormulaDefinition[]) ?? [
        { key: 'result', expression: 'a + b', precision: 2 },
      ]),
    [currentVersion],
  );

  const [inputValues, setInputValues] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    parsedInputsSchema.forEach((i) => {
      init[i.key] = i.defaultValue ?? 0;
    });
    return init;
  });
  const [runLabel, setRunLabel] = useState('');
  const [savingRun, setSavingRun] = useState(false);

  // Formula Editor toggle
  const [editingFormula, setEditingFormula] = useState(!activeDef);
  const [editName, setEditName] = useState(activeDef?.name ?? mod.name);
  const [editInputs, setEditInputs] = useState<InputFieldSchema[]>(parsedInputsSchema);
  const [editOutputs, setEditOutputs] = useState<OutputFieldSchema[]>(parsedOutputsSchema);
  const [editFormulas, setEditFormulas] = useState<FormulaDefinition[]>(parsedFormulas);
  const [changeNote, setChangeNote] = useState('');
  const [savingSchema, setSavingSchema] = useState(false);
  const [formulaErr, setFormulaErr] = useState<string | null>(null);

  const { data: history = [] } = useQuery({
    queryKey: ['calc-history', userId, activeDef?.id],
    queryFn: () =>
      activeDef ? listCalculatorHistory(createClient(), userId, activeDef.id) : Promise.resolve([]),
    enabled: Boolean(activeDef?.id),
  });

  const liveEvaluation = useMemo(() => {
    try {
      const outputs = evaluateFormulaSet(parsedFormulas, inputValues);
      return { ok: true as const, outputs };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof FormulaError ? err.message : 'Invalid calculation input',
      };
    }
  }, [parsedFormulas, inputValues]);

  const chartData = useMemo(() => {
    const primaryOut = parsedOutputsSchema[0]?.key ?? parsedFormulas[0]?.key ?? 'result';
    return [...history]
      .reverse()
      .map((h, idx) => ({
        run: h.label || `Run #${idx + 1}`,
        [primaryOut]: Number((h.outputs as Record<string, unknown>)?.[primaryOut] ?? 0),
      }));
  }, [history, parsedOutputsSchema, parsedFormulas]);

  async function handleSaveRun() {
    if (!activeDef || !currentVersion || !liveEvaluation.ok) return;
    setSavingRun(true);
    try {
      await saveCalculationRun(createClient(), userId, {
        topic_id: topicId,
        calculator_id: activeDef.id,
        calculator_version_id: currentVersion.id,
        inputs: inputValues,
        formulas: parsedFormulas,
        label: runLabel,
      });
      setRunLabel('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['calc-history'] }),
        queryClient.invalidateQueries({ queryKey: ['topic-analytics'] }),
      ]);
      pushToast({ kind: 'success', title: 'Calculation saved to history' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    } finally {
      setSavingRun(false);
    }
  }

  async function handleSaveCalculatorVersion(e: React.FormEvent) {
    e.preventDefault();
    setFormulaErr(null);
    setSavingSchema(true);
    try {
      const res = await createOrUpdateCalculator(createClient(), userId, {
        calculatorId: activeDef?.id,
        topic_id: topicId,
        module_id: mod.id,
        name: editName,
        inputs_schema: editInputs,
        outputs_schema: editOutputs,
        formulas: editFormulas,
        change_note: changeNote || undefined,
      });
      setEditingFormula(false);
      setChangeNote('');
      const nextInputs: Record<string, number> = {};
      editInputs.forEach((i) => {
        nextInputs[i.key] = i.defaultValue ?? 0;
      });
      setInputValues(nextInputs);
      onReloadTopic();
      pushToast({
        kind: 'success',
        title: `Saved calculator v${res.version.version_number}`,
      });
    } catch (err) {
      setFormulaErr(err instanceof Error ? err.message : 'Invalid formula specification');
    } finally {
      setSavingSchema(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Calculator className="h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">{activeDef?.name ?? mod.name}</h2>
            {currentVersion ? (
              <p className="text-xs text-muted-foreground">
                Formula v{currentVersion.version_number} • {currentVersion.change_note}
              </p>
            ) : null}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditingFormula((prev) => !prev)}>
          <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
          {editingFormula ? 'Close Formula Editor' : 'Edit Formulas'}
        </Button>
      </div>

      {editingFormula ? (
        <Card>
          <CardHeader>
            <CardTitle>Secure Formula &amp; Schema Editor</CardTitle>
            <CardDescription>
              Allowed operations: `+ - * / % ^`, comparisons, `cond ? a : b`, and functions `abs, round, floor, ceil, min, max, sum, avg, sqrt, pow, log, log10, clamp, pct, if`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveCalculatorVersion} className="space-y-4">
              {formulaErr ? (
                <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  {formulaErr}
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Calculator Name</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} required />
                </div>
                <div className="space-y-1">
                  <Label>Version Note</Label>
                  <Input
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="e.g., Adjusted weighting formula…"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Input Parameters</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setEditInputs((prev) => [
                        ...prev,
                        {
                          key: `input_${prev.length + 1}`,
                          label: `Input ${prev.length + 1}`,
                          type: 'decimal',
                          unit: '',
                          defaultValue: 0,
                        },
                      ])
                    }
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add Input
                  </Button>
                </div>
                {editInputs.map((inp, idx) => (
                  <div key={idx} className="grid gap-2 sm:grid-cols-12">
                    <Input
                      className="sm:col-span-4"
                      value={inp.label}
                      aria-label="Input label"
                      onChange={(e) => {
                        const copy = [...editInputs];
                        copy[idx] = {
                          ...inp,
                          label: e.target.value,
                          key: toFieldKey(e.target.value, `input_${idx + 1}`),
                        };
                        setEditInputs(copy);
                      }}
                    />
                    <Input
                      className="font-mono text-xs sm:col-span-3"
                      value={inp.key}
                      aria-label="Variable key"
                      readOnly
                    />
                    <Input
                      className="sm:col-span-2"
                      value={inp.unit ?? ''}
                      placeholder="Unit"
                      onChange={(e) => {
                        const copy = [...editInputs];
                        copy[idx] = { ...inp, unit: e.target.value };
                        setEditInputs(copy);
                      }}
                    />
                    <Input
                      className="sm:col-span-2"
                      type="number"
                      step="any"
                      value={inp.defaultValue}
                      onChange={(e) => {
                        const copy = [...editInputs];
                        copy[idx] = { ...inp, defaultValue: Number(e.target.value) };
                        setEditInputs(copy);
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditInputs((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Output Formulas</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const nextKey = `out_${editOutputs.length + 1}`;
                      setEditOutputs((prev) => [
                        ...prev,
                        { key: nextKey, label: `Output ${prev.length + 1}`, unit: '', precision: 2 },
                      ]);
                      setEditFormulas((prev) => [
                        ...prev,
                        { key: nextKey, expression: '0', precision: 2 },
                      ]);
                    }}
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    Add Output
                  </Button>
                </div>
                {editOutputs.map((out, idx) => {
                  const formula = editFormulas[idx] ?? { key: out.key, expression: '0', precision: 2 };
                  return (
                    <div key={idx} className="grid gap-2 sm:grid-cols-12">
                      <Input
                        className="sm:col-span-3"
                        value={out.label}
                        onChange={(e) => {
                          const newKey = toFieldKey(e.target.value, `out_${idx + 1}`);
                          const copyO = [...editOutputs];
                          copyO[idx] = { ...out, label: e.target.value, key: newKey };
                          setEditOutputs(copyO);
                          const copyF = [...editFormulas];
                          copyF[idx] = { ...formula, key: newKey };
                          setEditFormulas(copyF);
                        }}
                      />
                      <Input
                        className="font-mono text-xs sm:col-span-5"
                        value={formula.expression}
                        placeholder="e.g. round((a + b) / 2, 2)"
                        onChange={(e) => {
                          const copyF = [...editFormulas];
                          copyF[idx] = { ...formula, expression: e.target.value };
                          setEditFormulas(copyF);
                        }}
                      />
                      <Input
                        className="sm:col-span-2"
                        value={out.unit ?? ''}
                        placeholder="Unit"
                        onChange={(e) => {
                          const copyO = [...editOutputs];
                          copyO[idx] = { ...out, unit: e.target.value };
                          setEditOutputs(copyO);
                        }}
                      />
                      <NativeSelect
                        className="sm:col-span-1"
                        value={String(out.precision ?? 2)}
                        onChange={(e) => {
                          const p = Number(e.target.value);
                          const copyO = [...editOutputs];
                          copyO[idx] = { ...out, precision: p };
                          setEditOutputs(copyO);
                          const copyF = [...editFormulas];
                          copyF[idx] = { ...formula, precision: p };
                          setEditFormulas(copyF);
                        }}
                      >
                        {[0, 1, 2, 3, 4].map((p) => (
                          <option key={p} value={p}>
                            .{p}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={editOutputs.length <= 1}
                        onClick={() => {
                          setEditOutputs((prev) => prev.filter((_, i) => i !== idx));
                          setEditFormulas((prev) => prev.filter((_, i) => i !== idx));
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="submit" disabled={savingSchema}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save New Version
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {activeDef ? (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="lg:col-span-5">
            <CardHeader>
              <CardTitle>Inputs</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {parsedInputsSchema.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label htmlFor={`calc-in-${field.key}`}>
                    {field.label} {field.unit ? `(${field.unit})` : ''}
                  </Label>
                  <Input
                    id={`calc-in-${field.key}`}
                    type="number"
                    step="any"
                    value={inputValues[field.key] ?? 0}
                    onChange={(e) =>
                      setInputValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value === '' ? 0 : Number(e.target.value),
                      }))
                    }
                  />
                </div>
              ))}

              <div className="space-y-1 border-t border-border pt-3">
                <Label htmlFor="calc-run-label">Calculation Label (optional)</Label>
                <Input
                  id="calc-run-label"
                  value={runLabel}
                  onChange={(e) => setRunLabel(e.target.value)}
                  placeholder="e.g., Mock #4, Q3 Forecast…"
                />
              </div>

              <Button
                className="w-full"
                disabled={savingRun || !liveEvaluation.ok}
                onClick={handleSaveRun}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Calculation to History
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4 lg:col-span-7">
            <Card>
              <CardHeader>
                <CardTitle>Live Computed Outputs</CardTitle>
              </CardHeader>
              <CardContent>
                {liveEvaluation.ok ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {parsedOutputsSchema.map((out) => (
                      <div
                        key={out.key}
                        className="rounded-lg border border-border bg-muted/40 p-4"
                      >
                        <p className="text-xs font-medium text-muted-foreground">{out.label}</p>
                        <p className="mt-1 font-mono text-2xl font-bold text-primary tabular-nums">
                          {out.unit === '$' ? '$' : ''}
                          {Number(liveEvaluation.outputs[out.key] ?? 0).toFixed(out.precision ?? 2)}
                          {out.unit && out.unit !== '$' ? ` ${out.unit}` : ''}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    {liveEvaluation.error}
                  </div>
                )}
              </CardContent>
            </Card>

            {chartData.length > 0 ? (
              <AnalyticsChartCard
                title="Calculation Result Trend"
                data={chartData}
                xKey="run"
                series={[
                  {
                    key: parsedOutputsSchema[0]?.key ?? 'result',
                    label: parsedOutputsSchema[0]?.label ?? 'Result',
                  },
                ]}
                defaultType="line"
              />
            ) : null}
          </div>
        </div>
      ) : null}

      {history.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              Saved Calculation History ({history.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Label</TableHead>
                  <TableHead>Inputs</TableHead>
                  <TableHead>Outputs</TableHead>
                  <TableHead>Calculated At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.label || 'Saved run'}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {Object.entries(item.inputs as Record<string, unknown>)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(', ')}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {Object.entries(item.outputs as Record<string, unknown>)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' | ')}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTimeInZone(item.calculated_at, timezone)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
