import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AuthCard } from '@/features/authentication/auth-form';

export const metadata: Metadata = {
  title: 'Reset Password',
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="h-80 w-full max-w-md animate-pulse rounded-xl bg-muted" />}>
      <AuthCard mode="reset" />
    </Suspense>
  );
}
