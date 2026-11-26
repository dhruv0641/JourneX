import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main
      id="main-content"
      className="flex min-h-dvh flex-col items-center justify-center bg-background px-4 text-center text-foreground"
    >
      <div className="max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-warning/15 text-warning">
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        </div>
        <h1 className="font-serif text-3xl tracking-tight">You’re offline</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Reconnect to open your topics and save changes to your workspace.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            Retry Connection
          </Link>
        </div>
      </div>
    </main>
  );
}
