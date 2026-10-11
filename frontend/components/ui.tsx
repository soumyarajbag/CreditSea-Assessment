import { ReactNode } from 'react';
import { Info } from 'lucide-react';

import { formatLoanStatus } from '@/lib/format';
import { LoanStatus } from '@/lib/types';

export function BrandLogo({ className = '' }: { className?: string }) {
  return <img src="/logo.svg" alt="CreditSea" width={162} height={32} className={`h-8 w-auto ${className}`} />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl border border-slate-200/80 bg-white shadow-soft transition-all duration-300 hover:shadow-lg ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {eyebrow && <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>}
      <h1 className="text-2xl font-bold tracking-tight text-ink md:text-3xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: LoanStatus }) {
  const styles: Record<LoanStatus, string> = {
    APPLIED: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    SANCTIONED: 'bg-blue-50 text-blue-700 ring-blue-600/20',
    REJECTED: 'bg-rose-50 text-rose-700 ring-rose-600/20',
    DISBURSED: 'bg-violet-50 text-violet-700 ring-violet-600/20',
    CLOSED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold tracking-wide ring-1 ring-inset ${styles[status]}`}>
      {formatLoanStatus(status)}
    </span>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="animate-in fade-in zoom-in-95 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center duration-500">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-xl">◌</div>
      <h2 className="font-semibold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorMessage({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700 duration-300"
    >
      {message}
    </div>
  );
}

export function InfoTooltip({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-describedby={id}
        title={label}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-slate-400 transition hover:bg-blue-50 hover:text-brand focus:outline-none focus:ring-4 focus:ring-blue-100"
      >
        <Info className="h-4 w-4" aria-hidden="true" />
      </button>
      <span
        id={id}
        role="tooltip"
        className="pointer-events-none invisible fixed bottom-4 right-4 z-[60] w-[calc(100vw-2rem)] max-w-80 rounded-xl border border-slate-200 bg-ink px-3 py-2.5 text-left text-xs font-medium leading-5 text-white opacity-0 shadow-xl transition duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 sm:bottom-6 sm:right-6"
      >
        {children}
      </span>
    </span>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
    />
  );
}

export function CreditSeaLoader({
  label = 'Loading…',
  variant = 'panel',
  className = '',
}: {
  label?: string;
  variant?: 'screen' | 'panel' | 'compact';
  className?: string;
}) {
  const isScreen = variant === 'screen';
  const isCompact = variant === 'compact';
  const containerClass = isScreen
    ? 'min-h-screen bg-canvas'
    : isCompact
      ? 'min-h-36 rounded-2xl border border-blue-100 bg-white/90 px-5 py-8'
      : 'min-h-[calc(100vh-12rem)] rounded-3xl border border-slate-200/80 bg-white/80 px-6 py-16 shadow-soft';
  return (
    <div className={`flex items-center justify-center ${containerClass} ${className}`} role="status" aria-live="polite">
      <div className="flex flex-col items-center text-center">
        <div className="relative">
          <span
            className={`absolute animate-ping rounded-3xl bg-blue-100/70 ${isCompact ? '-inset-2' : '-inset-3'} [animation-duration:1.8s]`}
          />
          <div
            className={`relative rounded-2xl border border-blue-100 bg-white shadow-lg shadow-blue-100/60 ${isCompact ? 'px-4 py-3' : 'px-5 py-4'}`}
          >
            <BrandLogo className={isCompact ? 'h-6' : 'h-7'} />
          </div>
        </div>
        <div className={`inline-flex items-center gap-2 font-bold text-ink ${isCompact ? 'mt-5 text-xs' : 'mt-8 text-sm'}`}>
          <Spinner className={`text-brand ${isCompact ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} />
          {label}
        </div>
        {!isCompact && <p className="mt-2 text-xs text-slate-500">Preparing your CreditSea workspace</p>}
      </div>
    </div>
  );
}

export function FadeIn({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`animate-in fade-in slide-in-from-bottom-2 duration-500 ${className}`}>{children}</div>;
}

export function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return <CreditSeaLoader label={label} variant="screen" />;
}
