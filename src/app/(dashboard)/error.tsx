'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';

export default function DashboardError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error boundary caught:', error?.digest ?? error?.message ?? 'unknown');
  }, [error]);

  const handleRetry = () => {
    if (typeof retry === 'function') retry();
    else if (typeof reset === 'function') reset();
    else window.location.reload();
  };

  return (
    <div className="mx-auto my-12 w-full max-w-md rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
      <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/15 text-destructive">
        <AlertTriangle className="h-5 w-5" aria-hidden="true" />
      </div>
      <h1 className="text-xl font-bold tracking-tight">Unable to load dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Your session or workspace data could not be loaded cleanly. Try again or sign in again.
      </p>
      {error?.digest ? (
        <p className="mt-2 font-mono text-xs text-muted-foreground">Ref: {error.digest}</p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button onClick={handleRetry}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
        <Link href="/login" className={buttonVariants({ variant: 'outline' })}>
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
