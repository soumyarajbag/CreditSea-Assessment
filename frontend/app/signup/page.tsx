'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AuthLayout } from '@/components/auth-layout';
import { useToast } from '@/components/toast';
import { ErrorMessage, Spinner } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SignupPage() {
  const { user, loading, signup } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace('/borrower/apply');
  }, [loading, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const currentUser = await signup(email, password);
      toast.success(`Account created for ${currentUser.email}.`);
      router.replace('/borrower/apply');
    } catch (submissionError) {
      const message = submissionError instanceof ApiError ? submissionError.message : 'Unable to create account.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Borrower portal"
      title="Create your account"
      description="Sign up first, then complete the short eligibility application."
      footer={
        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link href="/login" className="font-bold text-brand hover:text-blue-700">
            Sign in
          </Link>
        </p>
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
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </label>
        <ErrorMessage message={error} />
        <button className="primary-button w-full py-3.5" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Creating account…' : 'Create borrower account'}
        </button>
      </form>
    </AuthLayout>
  );
}
