import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export function UnauthorizedState({
  title = 'You do not have access to this area',
  description = 'Your account is authenticated, but this workspace is restricted to another role.',
  actionHref = '/',
  actionLabel = 'Go to the right workspace',
}: {
  title?: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="flex min-h-[calc(100vh-12rem)] items-center justify-center py-10">
      <div className="w-full max-w-xl rounded-[2rem] border border-slate-200/80 bg-white p-8 text-center shadow-soft md:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100">
          <ShieldAlert className="h-8 w-8" aria-hidden="true" />
        </div>
        <p className="mt-7 text-xs font-black uppercase tracking-[0.2em] text-amber-600">403 - Not authorized</p>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-ink md:text-3xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-slate-500">{description}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={actionHref} className="primary-button">
            {actionLabel}
          </Link>
          <Link href="/" className="secondary-button">
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
