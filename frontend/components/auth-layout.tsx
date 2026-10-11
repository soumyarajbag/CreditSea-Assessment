import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';
import { ReactNode } from 'react';

import { BrandLogo } from './ui';

export function AuthLayout({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-canvas px-5 py-8 sm:py-12">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-2xl shadow-blue-950/10 lg:grid-cols-[0.92fr_1.08fr]">
        <section className="relative hidden overflow-hidden bg-ink p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-blue-500/25 blur-3xl" />
          <div className="absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="relative">
            <Link href="/" className="inline-flex rounded-xl bg-white px-3 py-2">
              <BrandLogo />
            </Link>
            <div className="mt-20 max-w-sm">
              <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                <Sparkles className="h-4 w-4" /> CreditSea workspace
              </p>
              <h2 className="mt-5 text-4xl font-black leading-tight tracking-[-0.04em]">Borrowing made clearer, one step at a time.</h2>
              <p className="mt-5 text-sm leading-7 text-slate-300">
                Apply, review, release, and repay with a workflow designed to keep every decision visible.
              </p>
            </div>
          </div>
          <div className="relative space-y-3 text-sm text-slate-300">
            <p className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Transparent application progress
            </p>
            <p className="flex items-center gap-3">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Role-safe access for every team
            </p>
          </div>
        </section>
        <section className="flex items-center p-6 sm:p-10 lg:p-14">
          <div className="w-full max-w-md mx-auto">
            <Link href="/" className="mb-9 inline-flex lg:hidden">
              <BrandLogo />
            </Link>
            <div className="animate-in fade-in zoom-in-95 duration-500">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand">{eyebrow}</p>
              <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-ink sm:text-4xl">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
              {children}
              {footer}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
