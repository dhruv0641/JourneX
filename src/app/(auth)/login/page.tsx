import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthCard } from '@/features/authentication/auth-form';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-xl bg-muted" />}>
      <AuthCard mode="login" />
    </Suspense>
  );
}
