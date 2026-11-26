'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().trim().min(1, 'Enter your name').max(80, 'Name is too long'),
});

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

const resetSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export function AuthCard({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') ?? '/dashboard';
  const [serverError, setServerError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const schema =
    mode === 'register'
      ? registerSchema
      : mode === 'forgot'
        ? forgotSchema
        : mode === 'reset'
          ? resetSchema
          : loginSchema;

  const form = useForm<Record<string, string>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema as any),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: Record<string, string>) {
    setServerError(null);
    setStatusMessage(null);
    const supabase = createClient();

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: values.email!.trim(),
          password: values.password!,
        });
        if (error) {
          setServerError(error.message);
          return;
        }
        router.push(nextPath.startsWith('/') ? nextPath : '/dashboard');
        router.refresh();
        return;
      }

      if (mode === 'register') {
        const origin = window.location.origin;
        const { data, error } = await supabase.auth.signUp({
          email: values.email!.trim(),
          password: values.password!,
          options: {
            data: { full_name: values.fullName!.trim() },
            emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
          },
        });
        if (error) {
          setServerError(error.message);
          return;
        }
        if (data.session) {
          router.push('/dashboard');
          router.refresh();
          return;
        }
        setStatusMessage(
          'Account created. Check your inbox to verify your email address, then sign in.',
        );
        return;
      }

      if (mode === 'forgot') {
        const origin = window.location.origin;
        const { error } = await supabase.auth.resetPasswordForEmail(values.email!.trim(), {
          redirectTo: `${origin}/auth/callback?next=/reset-password`,
        });
        if (error) {
          setServerError(error.message);
          return;
        }
        setStatusMessage(
          'If an account exists for that email, a password recovery link has been sent.',
        );
        return;
      }

      if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({
          password: values.password!,
        });
        if (error) {
          setServerError(error.message);
          return;
        }
        setStatusMessage('Password updated. Redirecting to your workspace…');
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setServerError('Unable to reach authentication service. Check your connection and retry.');
    }
  }

  const headings: Record<AuthMode, { title: string; subtitle: string; submitLabel: string }> = {
    login: {
      title: 'Sign in to JournalX',
      subtitle: 'Open your topics and pick up where you left off.',
      submitLabel: 'Sign in',
    },
    register: {
      title: 'Create your workspace',
      subtitle: 'Create an account to save your first topic.',
      submitLabel: 'Create account',
    },
    forgot: {
      title: 'Reset your password',
      subtitle: 'Enter your account email and we will send a recovery link.',
      submitLabel: 'Send recovery link',
    },
    reset: {
      title: 'Choose a new password',
      subtitle: 'Enter a strong password of at least 8 characters.',
      submitLabel: 'Update password',
    },
  };

  const copy = headings[mode];
  const errors = form.formState.errors;

  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-balance font-serif text-[clamp(2rem,3.5vw,2.9rem)] leading-tight tracking-tight text-foreground">
        {copy.title}
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">{copy.subtitle}</p>

      {serverError ? (
        <div
          role="alert"
          aria-live="polite"
          className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive"
        >
          {serverError}
        </div>
      ) : null}

      {statusMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-4 rounded-md border border-success/40 bg-success/10 px-3.5 py-2.5 text-sm text-success"
        >
          {statusMessage}
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
        {mode === 'register' ? (
          <div className="space-y-1.5">
            <label htmlFor="fullName" className="block text-sm font-medium text-foreground">
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              autoComplete="name"
              placeholder="Alex Rivera"
              className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? 'fullName-error' : undefined}
              {...form.register('fullName')}
            />
            {errors.fullName ? (
              <p id="fullName-error" className="text-sm text-destructive">
                {String(errors.fullName.message)}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode !== 'reset' ? (
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email address
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com"
              className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
              {...form.register('email')}
            />
            {errors.email ? (
              <p id="email-error" className="text-sm text-destructive">
                {String(errors.email.message)}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode !== 'forgot' ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                {mode === 'reset' ? 'New password' : 'Password'}
              </label>
              {mode === 'login' ? (
                <Link
                  href="/forgot-password"
                  className="inline-flex min-h-11 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Forgot password?
                </Link>
              ) : null}
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder={mode === 'login' ? undefined : 'At least 8 characters'}
                className="min-h-12 w-full rounded-lg border border-input bg-background pl-3 pr-14 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                {...form.register('password')}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <Eye className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p id="password-error" className="text-sm text-destructive">
                {String(errors.password.message)}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === 'reset' ? (
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              placeholder="Re-enter password"
              className="min-h-12 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-invalid={Boolean(errors.confirmPassword)}
              aria-describedby={errors.confirmPassword ? 'confirmPassword-error' : undefined}
              {...form.register('confirmPassword')}
            />
            {errors.confirmPassword ? (
              <p id="confirmPassword-error" className="text-sm text-destructive">
                {String(errors.confirmPassword.message)}
              </p>
            ) : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex group min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Processing…
            </>
          ) : (
            <>
              {copy.submitLabel}
              <ArrowRight
                className="h-4 w-4 motion-safe:transition-transform motion-safe:group-hover:translate-x-1"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      </form>

      <div className="mt-6 border-t border-border pt-4 text-center text-sm text-muted-foreground">
        {mode === 'login' ? (
          <>
            New to JournalX?{' '}
            <Link
              href="/register"
              className="inline-flex min-h-11 items-center rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Create an account
            </Link>
          </>
        ) : mode === 'register' ? (
          <>
            Already have an account?{' '}
            <Link
              href="/login"
              className="inline-flex min-h-11 items-center rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
            >
              Sign in
            </Link>
          </>
        ) : (
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-sm font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-ring"
          >
            Back to sign in
          </Link>
        )}
      </div>
    </div>
  );
}
