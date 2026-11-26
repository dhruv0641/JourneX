'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Circle,
  Clock,
  Kanban,
  List,
  Plus,
  Trash2,
} from 'lucide-react';
import { ConflictBanner, EmptyState } from '@/components/shared/state-views';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label, NativeSelect } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { formatDateInZone } from '@/lib/utilities/dates';
import { AppConflictError } from '@/lib/validation/common';
import {
  addChecklistItem,
  createTask,
  listTopicTasks,
  softDeleteTask,
  toggleChecklistItem,
  updateTaskWithVersion,
} from '@/services/modules.service';
import { useUiStore } from '@/stores/ui-store';
import type { TaskRow, TopicModuleRow } from '@/types/domain';

const PRIORITY_BADGE: Record<string, 'default' | 'primary' | 'warning' | 'destructive'> = {
  low: 'default',
  medium: 'primary',
  high: 'warning',
  urgent: 'destructive',
};

export function TasksModule({
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

  const cfg = (mod.config ?? {}) as {
    statuses?: string[];
    preferredView?: 'list' | 'kanban';
  };
  const statuses = cfg.statuses && cfg.statuses.length >= 2 ? cfg.statuses : ['todo', 'in_progress', 'done'];

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(
    cfg.preferredView === 'kanban' ? 'kanban' : 'list',
  );
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [conflictMsg, setConflictMsg] = useState<string | null>(null);

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newDue, setNewDue] = useState('');
  const [newEstimated, setNewEstimated] = useState('');
  const [creating, setCreating] = useState(false);

  // Checklist inputs per task
  const [subtaskInputs, setSubtaskInputs] = useState<Record<string, string>>({});

  const { data, refetch } = useQuery({
    queryKey: ['tasks', userId, topicId, mod.id, statusFilter, priorityFilter, search],
    queryFn: () =>
      listTopicTasks(createClient(), userId, topicId, {
        moduleId: mod.id,
        status: statusFilter,
        priority: priorityFilter,
        search,
        pageSize: 100,
      }),
  });

  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks]);
  const checklistsByTask = data?.checklistsByTask ?? {};

  const completionPct = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter((t) => t.status === 'done' || t.completed_at !== null).length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  async function invalidate() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tasks'] }),
      queryClient.invalidateQueries({ queryKey: ['topic-analytics'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] }),
    ]);
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      await createTask(createClient(), userId, {
        topic_id: topicId,
        module_id: mod.id,
        title: newTitle.trim(),
        priority: newPriority,
        due_at: newDue ? new Date(newDue).toISOString() : null,
        estimated_minutes: newEstimated ? Number(newEstimated) : null,
      });
      setNewTitle('');
      setNewDue('');
      setNewEstimated('');
      await invalidate();
      pushToast({ kind: 'success', title: 'Task added' });
    } catch (err) {
      pushToast({
        kind: 'error',
        title: 'Failed to create task',
        description: err instanceof Error ? err.message : 'Try again.',
      });
    } finally {
      setCreating(false);
    }
  }

  async function handleStatusChange(task: TaskRow, nextStatus: string) {
    setConflictMsg(null);
    try {
      await updateTaskWithVersion(
        createClient(),
        userId,
        task.id,
        { status: nextStatus },
        task.version,
      );
      await invalidate();
    } catch (err) {
      if (err instanceof AppConflictError) {
        setConflictMsg(err.message);
      } else {
        pushToast({ kind: 'error', title: 'Task update failed' });
      }
    }
  }

  async function handleBulkComplete() {
    const supabase = createClient();
    const targets = tasks.filter((t) => selectedIds.includes(t.id) && t.status !== 'done');
    for (const t of targets) {
      await updateTaskWithVersion(supabase, userId, t.id, { status: 'done' }, t.version);
    }
    setSelectedIds([]);
    await invalidate();
    pushToast({ kind: 'success', title: `Completed ${targets.length} task(s)` });
  }

  async function handleBulkDelete() {
    const supabase = createClient();
    for (const id of selectedIds) {
      await softDeleteTask(supabase, userId, id);
    }
    setSelectedIds([]);
    await invalidate();
    pushToast({ kind: 'success', title: 'Deleted selected tasks' });
  }

  async function handleAddSubtask(taskId: string) {
    const title = (subtaskInputs[taskId] ?? '').trim();
    if (!title) return;
    await addChecklistItem(createClient(), userId, topicId, taskId, title);
    setSubtaskInputs((prev) => ({ ...prev, [taskId]: '' }));
    await invalidate();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{mod.name}</h2>
          <Badge variant="primary" className="tabular-nums">
            {completionPct}% done ({tasks.length})
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-3.5 w-3.5" aria-hidden="true" />
            List
          </Button>
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <Kanban className="h-3.5 w-3.5" aria-hidden="true" />
            Kanban
          </Button>
        </div>
      </div>

      {conflictMsg ? (
        <ConflictBanner message={conflictMsg} onReload={() => void refetch()} />
      ) : null}

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleCreateTask} className="grid gap-2.5 sm:grid-cols-12">
            <div className="sm:col-span-5">
              <Label htmlFor={`new-task-${mod.id}`} className="sr-only">
                Task title
              </Label>
              <Input
                id={`new-task-${mod.id}`}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Add task or deliverable…"
                required
              />
            </div>
            <div className="sm:col-span-2">
              <NativeSelect
                aria-label="Task priority"
                value={newPriority}
                onChange={(e) =>
                  setNewPriority(e.target.value as 'low' | 'medium' | 'high' | 'urgent')
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </NativeSelect>
            </div>
            <div className="sm:col-span-2">
              <Input
                type="date"
                aria-label="Due date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
              />
            </div>
            <div className="sm:col-span-1">
              <Input
                type="number"
                min={0}
                aria-label="Estimated minutes"
                placeholder="Min"
                value={newEstimated}
                onChange={(e) => setNewEstimated(e.target.value)}
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={creating} className="w-full">
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Task
              </Button>
            </div>
          </form>

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            <Input
              aria-label="Search tasks"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter tasks…"
              className="max-w-xs"
            />
            <NativeSelect
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36"
            >
              <option value="all">All statuses</option>
              {statuses.map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </NativeSelect>
            <NativeSelect
              aria-label="Filter by priority"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-36"
            >
              <option value="all">All priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </NativeSelect>
            {selectedIds.length > 0 ? (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {selectedIds.length} selected
                </span>
                <Button size="sm" variant="outline" onClick={handleBulkComplete}>
                  Mark Done
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
                  Delete
                </Button>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {tasks.length === 0 ? (
        <EmptyState
          title="No tasks yet"
          description="Add your first task above with priority, due date, and optional subtasks."
        />
      ) : viewMode === 'kanban' ? (
        <div className="grid gap-4 md:grid-cols-3">
          {statuses.map((colStatus) => {
            const colTasks = tasks.filter((t) => t.status === colStatus);
            return (
              <div
                key={colStatus}
                className="flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 p-3"
              >
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {colStatus.replace(/_/g, ' ')}
                  </h3>
                  <Badge variant="outline">{colTasks.length}</Badge>
                </div>
                {colTasks.map((task) => (
                  <Card key={task.id}>
                    <CardContent className="space-y-2 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium">{task.title}</p>
                        <Badge variant={PRIORITY_BADGE[task.priority] ?? 'default'}>
                          {task.priority}
                        </Badge>
                      </div>
                      {task.due_at ? (
                        <p className="text-xs text-muted-foreground">
                          Due {formatDateInZone(task.due_at, timezone)}
                        </p>
                      ) : null}
                      <div className="flex items-center justify-between pt-1">
                        <NativeSelect
                          aria-label={`Move ${task.title} status`}
                          value={task.status}
                          onChange={(e) => void handleStatusChange(task, e.target.value)}
                          className="min-h-8 w-32 text-xs"
                        >
                          {statuses.map((s) => (
                            <option key={s} value={s}>
                              {s.replace(/_/g, ' ')}
                            </option>
                          ))}
                        </NativeSelect>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${task.title}`}
                          onClick={async () => {
                            await softDeleteTask(createClient(), userId, task.id);
                            await invalidate();
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" aria-hidden="true" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => {
            const isDone = task.status === 'done';
            const subtasks = checklistsByTask[task.id] ?? [];
            return (
              <Card key={task.id}>
                <CardContent className="space-y-2.5 p-3.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <input
                        type="checkbox"
                        aria-label={`Select task ${task.title}`}
                        checked={selectedIds.includes(task.id)}
                        onChange={(e) =>
                          setSelectedIds((prev) =>
                            e.target.checked
                              ? [...prev, task.id]
                              : prev.filter((id) => id !== task.id),
                          )
                        }
                      />
                      <button
                        type="button"
                        aria-label={isDone ? 'Reopen task' : 'Complete task'}
                        onClick={() => void handleStatusChange(task, isDone ? 'todo' : 'done')}
                        className="cursor-pointer text-primary"
                      >
                        {isDone ? (
                          <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        )}
                      </button>
                      <span
                        className={`text-sm font-medium ${isDone ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={PRIORITY_BADGE[task.priority] ?? 'default'}>
                        {task.priority}
                      </Badge>
                      {task.due_at ? (
                        <span className="text-xs text-muted-foreground">
                          Due {formatDateInZone(task.due_at, timezone)}
                        </span>
                      ) : null}
                      {task.estimated_minutes ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {task.estimated_minutes}m
                        </span>
                      ) : null}
                      <NativeSelect
                        aria-label={`Status for ${task.title}`}
                        value={task.status}
                        onChange={(e) => void handleStatusChange(task, e.target.value)}
                        className="min-h-8 w-32 text-xs"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, ' ')}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete task ${task.title}`}
                        onClick={async () => {
                          await softDeleteTask(createClient(), userId, task.id);
                          await invalidate();
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    </div>
                  </div>

                  {/* Subtask Checklist */}
                  <div className="ml-8 space-y-1.5 border-l border-border pl-3">
                    {subtasks.map((sub) => (
                      <label
                        key={sub.id}
                        className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground"
                      >
                        <input
                          type="checkbox"
                          checked={sub.is_completed}
                          onChange={async (e) => {
                            await toggleChecklistItem(
                              createClient(),
                              userId,
                              sub.id,
                              e.target.checked,
                            );
                            await invalidate();
                          }}
                        />
                        <span className={sub.is_completed ? 'line-through' : 'text-foreground'}>
                          {sub.title}
                        </span>
                      </label>
                    ))}
                    <div className="flex max-w-sm items-center gap-1.5 pt-0.5">
                      <Input
                        value={subtaskInputs[task.id] ?? ''}
                        onChange={(e) =>
                          setSubtaskInputs((prev) => ({ ...prev, [task.id]: e.target.value }))
                        }
                        placeholder="Add subtask…"
                        className="min-h-8 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            void handleAddSubtask(task.id);
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleAddSubtask(task.id)}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
