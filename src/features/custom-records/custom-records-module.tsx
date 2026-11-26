'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  Download,
  Plus,
  Search,
  Table2,
  Trash2,
  Upload,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/state-views';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input, Label, NativeSelect, Textarea } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { CustomFieldDraft } from '@/engine/feature-registry/types';
import {
  isFieldVisible,
  validateCustomRecordValues,
} from '@/engine/schema-engine/field-validation';
import { createClient } from '@/lib/supabase/client';
import { parseCsv, serializeToCsv } from '@/lib/utilities/csv';
import { formatDateInZone } from '@/lib/utilities/dates';
import {
  createCustomRecord,
  deleteCustomRecord,
  importCustomRecordsBatch,
  listCustomRecords,
} from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { CustomRecordRow, ModuleFieldRow, TopicModuleRow } from '@/types/domain';

export function CustomRecordsModule({
  userId,
  topicId,
  module: mod,
  fields,
  timezone,
}: {
  userId: string;
  topicId: string;
  module: TopicModuleRow;
  fields: ModuleFieldRow[];
  timezone: string;
}) {
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [recordTitle, setRecordTitle] = useState('');
  const [occurredAt, setOccurredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // CSV Import state
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  const fieldDrafts: CustomFieldDraft[] = useMemo(
    () =>
      fields.map((f) => ({
        field_key: f.field_key,
        label: f.label,
        field_type: f.field_type as CustomFieldDraft['field_type'],
        is_required: f.is_required,
        is_unique: f.is_unique,
        is_visible_in_table: f.is_visible_in_table,
        default_value: f.default_value,
        options: Array.isArray(f.options) ? (f.options as string[]) : [],
        validation_rules:
          typeof f.validation_rules === 'object' && f.validation_rules
            ? (f.validation_rules as CustomFieldDraft['validation_rules'])
            : {},
        visibility_condition:
          typeof f.visibility_condition === 'object' && f.visibility_condition
            ? (f.visibility_condition as CustomFieldDraft['visibility_condition'])
            : null,
        formula_expression: f.formula_expression,
        sort_order: f.sort_order,
      })),
    [fields],
  );

  const { data } = useQuery({
    queryKey: ['custom-records', userId, mod.id, page, search],
    queryFn: () =>
      listCustomRecords(createClient(), userId, mod.id, { page, pageSize: 25, search }),
  });

  const records = useMemo(() => data?.records ?? [], [data?.records]);
  const total = data?.total ?? 0;

  const expenseTotals = useMemo(() => {
    if (mod.feature_key !== 'expense_tracking') return null;
    let income = 0;
    let expense = 0;
    for (const r of records) {
      const d = (r.data ?? {}) as Record<string, unknown>;
      const amt = Number(d.amount ?? 0);
      if (!Number.isFinite(amt)) continue;
      if (String(d.entry_type ?? 'expense').toLowerCase() === 'income') {
        income += amt;
      } else {
        expense += amt;
      }
    }
    return { income, expense, net: income - expense };
  }, [mod.feature_key, records]);

  const columns = useMemo<ColumnDef<CustomRecordRow>[]>(() => {
    const visibleFields = fieldDrafts.filter((f) => f.is_visible_in_table !== false);
    const cols: ColumnDef<CustomRecordRow>[] = [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <span className="font-medium text-foreground">
            {row.original.title || '—'}
          </span>
        ),
      },
      ...visibleFields.map<ColumnDef<CustomRecordRow>>((f) => ({
        id: f.field_key,
        accessorFn: (row) => (row.data as Record<string, unknown>)?.[f.field_key] ?? '',
        header: f.label,
        cell: ({ row }) => {
          const val = (row.original.data as Record<string, unknown>)?.[f.field_key];
          if (val === null || val === undefined || val === '') return <span className="text-muted-foreground">—</span>;
          if (Array.isArray(val)) return <span className="text-xs">{val.join(', ')}</span>;
          if (typeof val === 'boolean') return <Badge variant={val ? 'success' : 'outline'}>{val ? 'Yes' : 'No'}</Badge>;
          if (f.field_type === 'currency') {
            return <span className="font-mono text-xs tabular-nums">${Number(val).toFixed(2)}</span>;
          }
          if (f.field_type === 'percentage') {
            return <span className="font-mono text-xs tabular-nums">{Number(val)}%</span>;
          }
          if (f.field_type === 'integer' || f.field_type === 'decimal' || f.field_type === 'formula') {
            return <span className="font-mono text-xs tabular-nums">{String(val)}</span>;
          }
          return <span className="text-xs">{String(val)}</span>;
        },
      })),
      {
        accessorKey: 'occurred_at',
        header: 'Date',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDateInZone(row.original.occurred_at, timezone)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete record"
            onClick={async () => {
              await deleteCustomRecord(createClient(), userId, row.original.id);
              await invalidate();
            }}
          >
            <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
          </Button>
        ),
      },
    ];
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldDrafts, timezone, userId]);

  const table = useReactTable({
    data: records,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['custom-records'] }),
      queryClient.invalidateQueries({ queryKey: ['topic-analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
    ]);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validateCustomRecordValues(fieldDrafts, formValues);
    if (!validation.valid) {
      setFieldErrors(validation.errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const derivedTitle =
        recordTitle.trim() ||
        String(
          validation.normalizedData[fieldDrafts[0]?.field_key ?? ''] ??
            `${mod.name} Entry`,
        );

      await createCustomRecord(createClient(), userId, {
        topic_id: topicId,
        module_id: mod.id,
        title: derivedTitle,
        data: validation.normalizedData,
        occurred_at: new Date(occurredAt).toISOString(),
      });
      setFormValues({});
      setRecordTitle('');
      setCreateOpen(false);
      await invalidate();
      pushToast({ kind: 'success', title: 'Record saved' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Check input values.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleExportCsv() {
    const headers = ['Title', ...fieldDrafts.map((f) => f.label), 'Date'];
    const rows = records.map((r) => [
      r.title,
      ...fieldDrafts.map((f) => {
        const val = (r.data as Record<string, unknown>)?.[f.field_key];
        return Array.isArray(val) ? val.join('; ') : val ?? '';
      }),
      r.occurred_at,
    ]);
    const csv = serializeToCsv(headers, rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mod.module_key}-export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleCsvFileSelected(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setCsvHeaders(parsed.headers);
    setCsvRows(parsed.rows);
    const autoMap: Record<string, string> = {};
    for (const h of parsed.headers) {
      const match = fieldDrafts.find(
        (f) => f.label.toLowerCase() === h.toLowerCase() || f.field_key === h.toLowerCase(),
      );
      if (match) autoMap[h] = match.field_key;
    }
    setColumnMap(autoMap);
  }

  const importPreview = useMemo(() => {
    const validRows: Array<{ title: string; data: Record<string, unknown> }> = [];
    const invalidRows: Array<{ rowNum: number; reason: string }> = [];

    csvRows.forEach((row, idx) => {
      const rawObj: Record<string, unknown> = {};
      csvHeaders.forEach((h, colIdx) => {
        const mappedKey = columnMap[h];
        if (mappedKey) rawObj[mappedKey] = row[colIdx] ?? '';
      });
      const check = validateCustomRecordValues(fieldDrafts, rawObj);
      if (!check.valid) {
        invalidRows.push({
          rowNum: idx + 1,
          reason: Object.values(check.errors).join('; '),
        });
      } else {
        const titleVal =
          row[csvHeaders.findIndex((h) => h.toLowerCase() === 'title')] ||
          String(check.normalizedData[fieldDrafts[0]?.field_key ?? ''] ?? `Row ${idx + 1}`);
        validRows.push({ title: titleVal, data: check.normalizedData });
      }
    });

    return { validRows, invalidRows };
  }, [csvHeaders, csvRows, columnMap, fieldDrafts]);

  async function handleConfirmImport() {
    if (importPreview.validRows.length === 0) return;
    setImporting(true);
    try {
      const summary = await importCustomRecordsBatch(
        createClient(),
        userId,
        topicId,
        mod.id,
        importPreview.validRows,
      );
      setImportOpen(false);
      setCsvHeaders([]);
      setCsvRows([]);
      await invalidate();
      pushToast({
        kind: 'success',
        title: `Imported ${summary.inserted} record(s)`,
        description:
          summary.skippedDuplicates > 0
            ? `${summary.skippedDuplicates} duplicate row(s) skipped.`
            : undefined,
      });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Check CSV format.',
      });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{mod.name}</h2>
          <p className="text-xs text-muted-foreground tabular-nums">{total} record(s)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-3.5 w-3.5" aria-hidden="true" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Add Entry
          </Button>
        </div>
      </div>

      {expenseTotals ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Income</p>
              <p className="mt-1 font-mono text-xl font-bold text-success tabular-nums">
                ${expenseTotals.income.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Expenses</p>
              <p className="mt-1 font-mono text-xl font-bold text-destructive tabular-nums">
                ${expenseTotals.expense.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Net Balance</p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums">
                ${expenseTotals.net.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          aria-label={`Search ${mod.name}`}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search records…"
          className="pl-9"
        />
      </div>

      {records.length === 0 ? (
        <EmptyState
          icon={<Table2 className="h-5 w-5" aria-hidden="true" />}
          title={`No entries in ${mod.name}`}
          description="Add your first structured entry or import rows from CSV."
          action={
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Entry
            </Button>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex cursor-pointer items-center gap-1 hover:text-foreground"
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <ArrowUpDown className="h-3 w-3" aria-hidden="true" />
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {total > 25 ? (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">Page {page}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page * 25 >= total}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      {/* Create Record Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent title={`Add ${mod.name} Entry`} description="All fields are validated before persistence.">
          <form onSubmit={handleCreateSubmit} className="space-y-3.5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="rec-title">Summary / Title</Label>
                <Input
                  id="rec-title"
                  value={recordTitle}
                  onChange={(e) => setRecordTitle(e.target.value)}
                  placeholder="Optional display title…"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="rec-date">Date</Label>
                <Input
                  id="rec-date"
                  type="date"
                  value={occurredAt}
                  onChange={(e) => setOccurredAt(e.target.value)}
                />
              </div>
            </div>

            {fieldDrafts.map((f) => {
              if (f.field_type === 'formula' || !isFieldVisible(f, formValues)) return null;
              const val = formValues[f.field_key] ?? '';
              const setVal = (v: unknown) =>
                setFormValues((prev) => ({ ...prev, [f.field_key]: v }));

              return (
                <div key={f.field_key} className="space-y-1">
                  <Label htmlFor={`fld-${f.field_key}`}>
                    {f.label} {f.is_required ? '*' : ''}
                  </Label>
                  {f.field_type === 'long_text' ? (
                    <Textarea
                      id={`fld-${f.field_key}`}
                      value={String(val)}
                      onChange={(e) => setVal(e.target.value)}
                    />
                  ) : f.field_type === 'dropdown' ? (
                    <NativeSelect
                      id={`fld-${f.field_key}`}
                      value={String(val)}
                      onChange={(e) => setVal(e.target.value)}
                    >
                      <option value="">Select…</option>
                      {(f.options ?? []).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </NativeSelect>
                  ) : f.field_type === 'checkbox' ? (
                    <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm">
                      <input
                        id={`fld-${f.field_key}`}
                        type="checkbox"
                        checked={Boolean(val)}
                        onChange={(e) => setVal(e.target.checked)}
                      />
                      <span>Yes</span>
                    </label>
                  ) : (
                    <Input
                      id={`fld-${f.field_key}`}
                      type={
                        ['integer', 'decimal', 'currency', 'percentage', 'duration', 'rating'].includes(
                          f.field_type,
                        )
                          ? 'number'
                          : f.field_type === 'date'
                            ? 'date'
                            : f.field_type === 'email'
                              ? 'email'
                              : f.field_type === 'url'
                                ? 'url'
                                : 'text'
                      }
                      step={
                        ['decimal', 'currency', 'percentage'].includes(f.field_type) ? 'any' : undefined
                      }
                      value={String(val)}
                      onChange={(e) => setVal(e.target.value)}
                    />
                  )}
                  {fieldErrors[f.field_key] ? (
                    <p className="text-xs text-destructive">{fieldErrors[f.field_key]}</p>
                  ) : null}
                </div>
              );
            })}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                Save Entry
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Validated CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent
          title={`Import CSV into ${mod.name}`}
          description="Map columns, review validation errors, and skip duplicates automatically."
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <Input
              type="file"
              accept=".csv,text/csv"
              aria-label="Choose CSV file"
              onChange={(e) => void handleCsvFileSelected(e.target.files?.[0])}
            />

            {csvHeaders.length > 0 ? (
              <>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                    Column Mapping
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {csvHeaders.map((h) => (
                      <div key={h} className="flex items-center gap-2">
                        <span className="w-32 truncate text-xs font-medium">{h}</span>
                        <NativeSelect
                          value={columnMap[h] ?? ''}
                          onChange={(e) =>
                            setColumnMap((prev) => ({ ...prev, [h]: e.target.value }))
                          }
                          className="min-h-8 text-xs"
                        >
                          <option value="">Ignore column</option>
                          {fieldDrafts.map((f) => (
                            <option key={f.field_key} value={f.field_key}>
                              {f.label}
                            </option>
                          ))}
                        </NativeSelect>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-border bg-muted/40 p-3 text-xs">
                  <p>
                    Ready to import: <strong>{importPreview.validRows.length}</strong> valid row(s) •{' '}
                    <strong className="text-destructive">{importPreview.invalidRows.length}</strong> invalid row(s)
                  </p>
                  {importPreview.invalidRows.slice(0, 3).map((err) => (
                    <p key={err.rowNum} className="mt-1 text-destructive">
                      Row {err.rowNum}: {err.reason}
                    </p>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setImportOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={importing || importPreview.validRows.length === 0}
                    onClick={handleConfirmImport}
                  >
                    Import {importPreview.validRows.length} Valid Row(s)
                  </Button>
                </div>
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
