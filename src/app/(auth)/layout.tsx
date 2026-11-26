import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-md pb-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to overview
        </Link>
      </div>
      <main id="main-content" className="flex flex-1 items-center justify-center">
        {children}
      </main>
    </div>
  );
}
