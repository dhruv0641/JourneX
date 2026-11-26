'use client';

import { Button } from '@/components/ui/button';

export function FeaturePending({
  title,
  error = false,
  onRetry,
}: {
  title: string;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="space-y-6" aria-busy={!error}>
      <h1 className="font-serif text-4xl tracking-tight">{title}</h1>
      {error ? (
        <div role="alert" className="flex items-center gap-3">
          <span>Couldn’t load this feature.</span>
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="workspace-loading" role="status" aria-label={`Loading ${title}`}>
          <span className="sr-only">Loading {title}…</span>
          <div className="workspace-loading-line workspace-loading-subtitle" />
          <div className="workspace-loading-grid">
            <div className="workspace-loading-panel" />
            <div className="workspace-loading-panel" />
          </div>
        </div>
      )}
    </div>
  );
}
