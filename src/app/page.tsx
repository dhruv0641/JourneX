import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Calculator, CheckSquare, Clock, Layers, ShieldCheck, Sparkles } from 'lucide-react';
import { getAuthenticatedClaims } from '@/lib/supabase/server';

export default async function HomePage() {
  const claims = await getAuthenticatedClaims();
  if (claims) {
    redirect('/dashboard');
  }

  return (
    <main id="main-content" className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Layers className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight" translate="no">
              NEXORA
            </span>
          </div>
          <nav aria-label="Authentication" className="flex items-center gap-3">
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-md px-4 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            Schema-Driven Personal Operating System backed by Supabase PostgreSQL
          </div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            Build independent mini-apps for every domain of your life.
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground sm:text-lg">
            NEXORA unifies configurable topics, tasks, rich journaling, live time tracking,
            custom calculators, habits, goals, and real-data analytics inside one database-backed
            operating system.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Create your workspace
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Sign in to workspace
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Sparkles,
              title: 'Dynamic Topic Builder',
              body: 'Compose custom topics with deterministic recommendations, templates, and tailored views.',
            },
            {
              icon: CheckSquare,
              title: 'Tasks, Habits & Goals',
              body: 'Track execution across Kanban, lists, checklists, streaks, and period targets.',
            },
            {
              icon: Calculator,
              title: 'AST Formula Calculators',
              body: 'Build versioned multi-input calculators with safe formula validation and result history.',
            },
            {
              icon: Clock,
              title: 'Synced Time & Analytics',
              body: 'Server-timestamped timers, real PostgreSQL aggregations, and full CSV/JSON portability.',
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-lg border border-border bg-card p-5"
            >
              <item.icon className="mb-3 h-5 w-5 text-primary" aria-hidden="true" />
              <h2 className="text-sm font-semibold">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
