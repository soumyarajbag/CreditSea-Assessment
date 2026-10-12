'use client';

import Link from 'next/link';
import { CheckCircle2, MailCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { AuthLayout } from '@/components/auth-layout';
import { useToast } from '@/components/toast';
import { ErrorMessage, LoadingScreen } from '@/components/ui';
import { apiFetch, ApiError, jsonBody } from '@/lib/api';

type VerificationState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const { toast } = useToast();
  const requested = useRef(false);
  const [state, setState] = useState<VerificationState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;

    const token = new URLSearchParams(window.location.search).get('token');
    if (!token) {
      setError('This verification link is missing its token. Request a new email and try again.');
      setState('error');
      return;
    }

    apiFetch<{ message: string }>('/auth/verify-email', {
      method: 'POST',
      ...jsonBody({ token }),
    })
      .then(({ message }) => {
        setState('success');
        toast.success(message);
      })
      .catch((verificationError) => {
        const message = verificationError instanceof ApiError ? verificationError.message : 'Unable to verify this email.';
        setError(message);
        setState('error');
        toast.error(message);
      });
  }, [toast]);

  if (state === 'loading') {
    return <LoadingScreen label="Verifying your email..." />;
  }

  return (
    <AuthLayout
      eyebrow={state === 'success' ? 'Email verified' : 'Verification link'}
      title={state === 'success' ? 'You are ready to sign in' : 'We could not verify this email'}
      description={
        state === 'success'
          ? 'Your CreditSea account is active. Sign in to complete your borrower profile.'
          : 'The link may be expired or already used. You can create a fresh verification email from the sign-up or sign-in page.'
      }
      footer={
        <p className="mt-6 text-center text-sm text-slate-500">
          Need a different account?{' '}
          <Link href="/signup" className="font-bold text-brand hover:text-blue-700">
            Create one
          </Link>
        </p>
      }
    >
      {state === 'success' ? (
        <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50 p-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
          <p className="mt-4 text-sm leading-6 text-emerald-900">Your email address has been confirmed successfully.</p>
          <Link href="/login" className="primary-button mt-6 inline-flex w-full justify-center py-3.5">
            Continue to sign in
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <MailCheck className="h-10 w-10 text-amber-700" />
          <ErrorMessage message={error} />
          <Link href="/login" className="secondary-button mt-5 inline-flex w-full justify-center py-3.5">
            Return to sign in
          </Link>
        </div>
      )}
    </AuthLayout>
  );
}
