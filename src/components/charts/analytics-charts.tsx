'use client';

import { useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { TableIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];

export interface ChartSeriesConfig {
  key: string;
  label: string;
  colorIndex?: number;
}

export function AnalyticsChartCard({
  title,
  subtitle,
  data,
  xKey,
  series,
  defaultType = 'area',
  allowTypeSwitch = true,
}: {
  title: string;
  subtitle?: string;
  data: Array<Record<string, string | number>>;
  xKey: string;
  series: ChartSeriesConfig[];
  defaultType?: 'area' | 'line' | 'bar' | 'donut' | 'scatter';
  allowTypeSwitch?: boolean;
}) {
  const [chartType, setChartType] = useState(defaultType);
  const [showTable, setShowTable] = useState(false);

  const primarySeries = series[0];

  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 text-card-foreground"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {allowTypeSwitch ? (
            <div className="flex max-w-full flex-wrap rounded-md border border-border p-0.5">
              {(['area', 'bar', 'line', 'donut', 'scatter'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setChartType(type)}
                  aria-pressed={chartType === type}
                  className={`min-h-11 min-w-11 cursor-pointer rounded px-2 py-1 text-xs font-medium capitalize transition-colors ${
                    chartType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          ) : null}
          <Button
            variant={showTable ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowTable((prev) => !prev)}
            aria-pressed={showTable}
            aria-label={`Toggle data table for ${title}`}
          >
            <TableIcon className="h-3.5 w-3.5" aria-hidden="true" />
            Table
          </Button>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex h-56 items-center justify-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
          No recorded data points for this period yet.
        </div>
      ) : showTable ? (
        <div className="max-h-64 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{xKey}</TableHead>
                {series.map((s) => (
                  <TableHead key={s.key} className="text-right">
                    {s.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow key={`${String(row[xKey])}-${idx}`}>
                  <TableCell className="font-mono text-xs">{String(row[xKey])}</TableCell>
                  {series.map((s) => (
                    <TableCell key={s.key} className="text-right font-mono text-xs tabular-nums">
                      {String(row[s.key] ?? 0)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {series.map((s, idx) => (
                  <Bar
                    key={s.key}
                    dataKey={s.key}
                    name={s.label}
                    fill={CHART_COLORS[(s.colorIndex ?? idx) % CHART_COLORS.length]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {series.map((s, idx) => (
                  <Line
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={CHART_COLORS[(s.colorIndex ?? idx) % CHART_COLORS.length]}
                    strokeWidth={2}
                    strokeDasharray={idx === 1 ? '5 3' : idx === 2 ? '2 2' : undefined}
                    dot={{ r: 2.5 }}
                  />
                ))}
              </LineChart>
            ) : chartType === 'donut' && primarySeries ? (
              <PieChart>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Pie
                  data={data.slice(-6)}
                  dataKey={primarySeries.key}
                  nameKey={xKey}
                  innerRadius={52}
                  outerRadius={86}
                  paddingAngle={3}
                >
                  {data.slice(-6).map((_, idx) => (
                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            ) : chartType === 'scatter' && primarySeries ? (
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey={xKey} name={xKey} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis
                  dataKey={primarySeries.key}
                  name={primarySeries.label}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Scatter
                  name={primarySeries.label}
                  data={data}
                  fill={CHART_COLORS[0]}
                />
              </ScatterChart>
            ) : (
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey={xKey} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    borderColor: 'var(--border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {series.map((s, idx) => (
                  <Area
                    key={s.key}
                    type="monotone"
                    dataKey={s.key}
                    name={s.label}
                    stroke={CHART_COLORS[(s.colorIndex ?? idx) % CHART_COLORS.length]}
                    fill={CHART_COLORS[(s.colorIndex ?? idx) % CHART_COLORS.length]}
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                ))}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export function HabitCalendarHeatmap({
  datesMap,
  days = 84,
}: {
  datesMap: Map<string, number>;
  days?: number;
}) {
  const cells: Array<{ date: string; count: number }> = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: key, count: datesMap.get(key) ?? 0 });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1" role="img" aria-label={`Habit consistency heatmap over the last ${days} days`}>
        {cells.map((cell) => {
          const level =
            cell.count >= 3
              ? 'bg-primary text-primary-foreground'
              : cell.count === 2
                ? 'bg-primary/70 text-primary-foreground'
                : cell.count === 1
                  ? 'bg-primary/35 text-foreground'
                  : 'bg-muted text-muted-foreground';
          return (
            <div
              key={cell.date}
              title={`${cell.date}: ${cell.count} check-in(s)`}
              className={`flex h-4 w-4 items-center justify-center rounded-[3px] text-[9px] font-mono ${level}`}
            >
              {cell.count > 0 ? cell.count : ''}
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Less</span>
        <span className="h-3 w-3 rounded-[2px] bg-muted" />
        <span className="h-3 w-3 rounded-[2px] bg-primary/35" />
        <span className="h-3 w-3 rounded-[2px] bg-primary/70" />
        <span className="h-3 w-3 rounded-[2px] bg-primary" />
        <span>More</span>
      </div>
    </div>
  );
}
