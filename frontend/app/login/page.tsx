'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AuthLayout } from '@/components/auth-layout';
import { useToast } from '@/components/toast';
import { ErrorMessage, LoadingScreen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading, login, resendVerification } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(user.role === 'BORROWER' ? '/borrower/apply' : '/dashboard');
  }, [loading, router, user]);

  if (loading || submitting || user) {
    return <LoadingScreen label={submitting ? 'Signing you in...' : 'Loading your workspace...'} />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setErrorCode(undefined);
    setSubmitting(true);
    try {
      const currentUser = await login(email, password);
      toast.success(`Welcome back, ${currentUser.fullName ?? currentUser.email}.`);
      router.replace(currentUser.role === 'BORROWER' ? '/borrower/apply' : '/dashboard');
    } catch (submissionError) {
      const message = submissionError instanceof ApiError ? submissionError.message : 'Unable to sign in.';
      setError(message);
      setErrorCode(submissionError instanceof ApiError ? submissionError.code : undefined);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      const message = await resendVerification(email);
      toast.success(message);
    } catch (resendError) {
      const message = resendError instanceof ApiError ? resendError.message : 'Unable to resend the verification email.';
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Sign in to your workspace"
      description="Use your borrower or operations credentials to continue."
      footer={
        <>
          <p className="mt-6 text-center text-sm text-slate-500">
            New borrower?{' '}
            <Link href="/signup" className="font-bold text-brand hover:text-blue-700">
              Create an account
            </Link>
          </p>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block text-sm font-bold text-ink">
          Email
          <input
            className="field"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <label className="block text-sm font-bold text-ink">
          Password
          <span className="relative mt-1 block">
            <input
              className="field pr-12"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-brand focus:outline-none focus:ring-4 focus:ring-blue-100"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </span>
        </label>
        <ErrorMessage message={error} />
        {errorCode === 'EMAIL_NOT_VERIFIED' && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
            <p>Check your inbox for the verification link before signing in.</p>
            <button
              type="button"
              className="mt-3 font-bold text-amber-950 underline"
              onClick={handleResendVerification}
              disabled={resending}
            >
              {resending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
        )}
        <button className="primary-button w-full py-3.5" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
