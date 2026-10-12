'use client';

import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { AuthLayout } from '@/components/auth-layout';
import { useToast } from '@/components/toast';
import { ErrorMessage, Spinner } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SignupPage() {
  const { user, loading, resendVerification, signup } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationExpiresHours, setVerificationExpiresHours] = useState(24);

  useEffect(() => {
    if (!loading && user) router.replace('/borrower/apply');
  }, [loading, router, user]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await signup(email, password);
      setRegisteredEmail(result.email);
      setVerificationExpiresHours(result.verificationExpiresHours);
      setVerificationSent(true);
      toast.success('Account created. Check your inbox to verify your email.');
    } catch (submissionError) {
      const message = submissionError instanceof ApiError ? submissionError.message : 'Unable to create account.';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResending(true);
    try {
      const message = await resendVerification(registeredEmail);
      toast.success(message);
    } catch (resendError) {
      const message = resendError instanceof ApiError ? resendError.message : 'Unable to resend the verification email.';
      setError(message);
      toast.error(message);
    } finally {
      setResending(false);
    }
  };

  if (verificationSent) {
    return (
      <AuthLayout
        eyebrow="Check your inbox"
        title="Verify your email"
        description="Your account is almost ready. Confirm your email address before signing in."
        footer={
          <p className="mt-6 text-center text-sm text-slate-500">
            Already verified?{' '}
            <Link href="/login" className="font-bold text-brand hover:text-blue-700">
              Sign in
            </Link>
          </p>
        }
      >
        <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 text-sm leading-6 text-slate-600">
          <p>
            We sent a verification link to <strong className="text-ink">{registeredEmail}</strong>. The link is valid for{' '}
            {verificationExpiresHours} hours.
          </p>
          <p className="mt-3">If you do not see it, check your spam folder or request another link.</p>
        </div>
        <ErrorMessage message={error} />
        <button type="button" className="secondary-button mt-5 w-full py-3.5" onClick={handleResend} disabled={resending}>
          {resending ? 'Sending...' : 'Resend verification email'}
        </button>
      </AuthLayout>
    );
  }

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
          <span className="relative mt-1 block">
            <input
              className="field pr-12"
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
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
        <button className="primary-button w-full py-3.5" disabled={submitting}>
          {submitting && <Spinner />}
          {submitting ? 'Creating account…' : 'Create borrower account'}
        </button>
      </form>
    </AuthLayout>
  );
}
