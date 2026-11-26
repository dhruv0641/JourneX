'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, WifiOff, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utilities/cn';
import { useUiStore } from '@/stores/ui-store';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-muted', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      {icon ? (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          {icon}
        </div>
      ) : null}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  title = 'Unable to load workspace data',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start justify-between gap-4 rounded-lg border border-destructive/40 bg-destructive/10 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>
        </div>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Retry
        </Button>
      ) : null}
    </div>
  );
}

export function ConflictBanner({
  message,
  onReload,
}: {
  message: string;
  onReload: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col justify-between gap-3 rounded-lg border border-warning/50 bg-warning/10 p-3.5 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
        <div className="text-xs sm:text-sm">
          <span className="font-semibold text-foreground">Concurrent update detected: </span>
          <span className="text-muted-foreground">{message}</span>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onReload}>
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        Reload latest
      </Button>
    </div>
  );
}

export function OfflineBanner() {
  const isOffline = useUiStore((s) => s.isOffline);
  if (!isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 border-b border-warning/40 bg-warning/15 px-4 py-2 text-xs font-medium text-foreground"
    >
      <WifiOff className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
      Offline mode — displaying cached view only. New edits require an active connection.
    </div>
  );
}

export function ToastViewport() {
  const toasts = useUiStore((s) => s.toasts);
  const dismissToast = useUiStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 top-16 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start justify-between gap-2 rounded-lg border bg-card p-3.5 shadow-lg',
            toast.kind === 'error'
              ? 'border-destructive/50'
              : toast.kind === 'warning'
                ? 'border-warning/50'
                : 'border-border',
          )}
        >
          <div className="flex items-start gap-2">
            {toast.kind === 'error' || toast.kind === 'warning' ? (
              <AlertTriangle
                className={cn(
                  'mt-0.5 h-4 w-4 shrink-0',
                  toast.kind === 'error' ? 'text-destructive' : 'text-warning',
                )}
                aria-hidden="true"
              />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground">{toast.title}</p>
              {toast.description ? (
                <p className="mt-0.5 text-xs text-muted-foreground">{toast.description}</p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded text-muted-foreground hover:bg-muted"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
