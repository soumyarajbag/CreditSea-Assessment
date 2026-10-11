'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AuthLayout } from '@/components/auth-layout';
import { useToast } from '@/components/toast';
import { ErrorMessage, LoadingScreen } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, loading, login } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace(user.role === 'BORROWER' ? '/borrower/apply' : '/dashboard');
  }, [loading, router, user]);

  if (loading || submitting || user) {
    return <LoadingScreen label={submitting ? 'Signing you in...' : 'Loading your workspace...'} />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const currentUser = await login(email, password);
      toast.success(`Welcome back, ${currentUser.fullName ?? currentUser.email}.`);
      router.replace(currentUser.role === 'BORROWER' ? '/borrower/apply' : '/dashboard');
    } catch (submissionError) {
      const message = submissionError instanceof ApiError ? submissionError.message : 'Unable to sign in.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
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
          <p className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-slate-600">
            Demo accounts use password <strong className="text-ink">Password123!</strong>. Executive emails are listed in the README.
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
          <input
            className="field"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />
        </label>
        <ErrorMessage message={error} />
        <button className="primary-button w-full py-3.5" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthLayout>
  );
}
