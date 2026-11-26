import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, Layers } from 'lucide-react';
import { getSupabasePublicConfig } from '@/lib/supabase/env';
import { getAuthenticatedClaims } from '@/lib/supabase/server';
import { buttonVariants } from '@/components/ui/button';
import { TopicPreview } from '@/features/authentication/topic-preview';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const isConfigured = Boolean(getSupabasePublicConfig());
  if (isConfigured && (await getAuthenticatedClaims())) {
    redirect('/dashboard');
  }

  return (
    <main id="main-content" className="min-h-dvh bg-background text-foreground">
      {!isConfigured ? (
        <div
          role="status"
          className="border-b border-warning/40 bg-warning/15 px-4 py-2.5 text-center text-xs font-medium text-foreground sm:text-sm"
        >
          Supabase configuration pending: add{' '}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> in Vercel
          Environment Variables and redeploy.
        </div>
      ) : null}
      <header className="mx-auto flex min-h-[4.5rem] max-w-7xl items-center justify-between gap-2 border-b border-border px-5 sm:px-10">
        <span
          className="inline-flex items-center gap-2.5 font-serif text-xl tracking-[.12em]"
          translate="no"
        >
          <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">
            <Layers size={17} aria-hidden="true" />
          </span>
          JournalX
        </span>
        <nav aria-label="Account">
          <Link
            href="/login"
            className={buttonVariants({
              variant: 'outline',
              size: 'touch',
              className: 'rounded-full',
            })}
          >
            Sign in <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </nav>
      </header>
      <section className="mx-auto grid max-w-7xl items-center gap-7 px-5 py-8 sm:gap-10 sm:px-10 sm:py-14 lg:grid-cols-[.85fr_1.15fr] lg:gap-14 lg:py-20">
        <div className="jx-enter">
          <h1 className="max-w-[15ch] font-serif text-[clamp(2.65rem,5.9vw,5.65rem)] leading-[1.02] tracking-[-.055em]">
            Give each project <em className="font-normal text-primary">a home.</em>
          </h1>
          <p className="mt-4 max-w-md leading-relaxed text-muted-foreground sm:text-lg">
            A topic keeps your next task, your time, and your notes together. Build one for a trip,
            a course, or whatever comes next.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link
              href="/register"
              className={buttonVariants({ size: 'lg', className: 'rounded-full px-5' })}
            >
              Create your workspace <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <a
              href="#sample-topic"
              className="inline-flex min-h-11 items-center rounded text-sm font-semibold text-primary underline decoration-primary/40 underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
            >
              Explore a topic
            </a>
          </div>
        </div>
        <TopicPreview />
      </section>
    </main>
  );
}
