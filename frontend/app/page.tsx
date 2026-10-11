'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react';

import { BrandLogo } from '@/components/ui';
import { useAuth } from '@/lib/auth';

const highlights = [
  {
    title: 'Borrower-first application',
    description: 'Capture profile details, eligibility, salary proof, loan amount, and tenure in one guided flow.',
  },
  {
    title: 'Role-based operations',
    description: 'Move each application through Sales, Sanction, Disbursement, and Collection with clear ownership.',
  },
  { title: 'Repayment visibility', description: 'Track total repayment, paid amount, outstanding balance, and automatic loan closure.' },
];

const journey = [
  {
    step: '01',
    title: 'Check eligibility',
    description: 'Validate age, salary, PAN, and employment mode before an application can proceed.',
    icon: BadgeCheck,
  },
  {
    step: '02',
    title: 'Submit an application',
    description: 'Upload a salary slip, choose amount and tenure, and see simple-interest calculations live.',
    icon: ClipboardCheck,
  },
  {
    step: '03',
    title: 'Review and release',
    description: 'Sanction approves or rejects, Disbursement releases funds, and Collection manages payments.',
    icon: Landmark,
  },
  {
    step: '04',
    title: 'Close with confidence',
    description: 'Payments reduce the outstanding balance and the loan closes automatically when fully repaid.',
    icon: ReceiptText,
  },
];

const roles = [
  ['Borrower', 'Apply, follow eligibility feedback, upload documents, and track the current loan.'],
  ['Sales', 'View registered borrowers who have not submitted an application.'],
  ['Sanction', 'Review applied loans and approve or reject with a reason.'],
  ['Disbursement', 'View sanctioned loans and mark funds as disbursed.'],
  ['Collection', 'Record unique-UTR payments and monitor outstanding balances.'],
  ['Admin', 'Access every operations module with the same server-enforced controls.'],
];

export default function HomePage() {
  const { user } = useAuth();
  const destination = user ? (user.role === 'BORROWER' ? '/borrower/apply' : '/dashboard') : '/login';

  return (
    <main className="min-h-screen overflow-hidden bg-canvas">
      <div className="relative isolate">
        <div className="pointer-events-none absolute -right-40 -top-44 -z-10 h-[34rem] w-[34rem] rounded-full bg-blue-200/40 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 top-[32rem] -z-10 h-96 w-96 rounded-full bg-emerald-100/60 blur-3xl" />

        <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 lg:px-10">
          <Link href="/" className="rounded-xl transition-opacity hover:opacity-80 focus:outline-none focus:ring-4 focus:ring-blue-100">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-blue-100 bg-white px-3 py-2 text-xs font-bold text-brand shadow-sm sm:inline-flex">
              Loan Management System
            </span>
            <Link href={destination} className="primary-button px-5 py-2.5">
              {user ? 'Open workspace' : 'Sign in'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-16 pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:px-10 lg:pb-24 lg:pt-20">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white px-3.5 py-2 text-xs font-bold text-brand shadow-sm">
              <Sparkles className="h-3.5 w-3.5" /> Assessment-ready lending workflow
            </div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.02] tracking-[-0.055em] text-ink md:text-7xl">
              From loan application to repayment, in one clear journey.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-500">
              CreditSea is a focused Loan Management System that connects borrowers with lending operations. It covers eligibility checks,
              salary-slip verification, sanction decisions, disbursement, collections, and repayment tracking without losing ownership at
              each handoff.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={destination} className="primary-button px-5 py-3.5">
                {user ? 'Continue to workspace' : 'Start the borrower journey'}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!user && (
                <Link href="/signup" className="secondary-button px-5 py-3.5">
                  Create borrower account
                </Link>
              )}
            </div>
            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
                <p className="text-xl font-black text-ink">6</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">role-based views</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
                <p className="text-xl font-black text-ink">4</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">operations stages</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
                <p className="text-xl font-black text-ink">12%</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">simple interest p.a.</p>
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-soft">
                <p className="text-xl font-black text-ink">1</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">current loan journey</p>
              </div>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-semibold text-slate-500">
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Server-enforced access
              </span>
              <span className="inline-flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-brand" /> Clear business rules
              </span>
            </div>
          </div>

          <div className="relative animate-in fade-in zoom-in-95 duration-700 lg:pl-8">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-blue-200/70 via-transparent to-emerald-200/70 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] bg-ink p-6 text-white shadow-2xl shadow-blue-900/15 md:p-8">
              <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-blue-500/30 blur-3xl" />
              <div className="absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl" />
              <div className="relative">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Borrower to collection</p>
                    <p className="mt-2 text-sm text-slate-300">One shared view of the loan lifecycle.</p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-emerald-300">
                    <CheckCircle2 className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.07] p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Loan lifecycle</p>
                    <span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-[11px] font-bold text-emerald-300">Traceable</span>
                  </div>
                  <div className="mt-5 space-y-5">
                    {['Application submitted', 'Sanction decision', 'Funds released', 'Repayment tracked'].map((item, index) => (
                      <div key={item} className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${index < 3 ? 'bg-emerald-400 text-ink' : 'bg-white/10 text-slate-400'}`}
                        >
                          {index < 3 ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-black">4</span>}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className={`text-sm font-bold ${index < 3 ? 'text-white' : 'text-slate-400'}`}>{item}</p>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                              {index < 3 ? 'Done' : 'Next'}
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div className={`h-full rounded-full ${index < 3 ? 'w-full bg-emerald-400' : 'w-1/3 bg-blue-300'}`} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white p-4 text-ink">
                    <p className="text-xs font-bold text-slate-400">Eligibility</p>
                    <p className="mt-2 text-lg font-black">Rule-checked</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-400 p-4 text-ink">
                    <p className="text-xs font-bold text-emerald-950/60">Repayment</p>
                    <p className="mt-2 text-lg font-black">Visible</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-10 lg:pb-24">
          <div className="max-w-2xl">
            <p className="eyebrow">What the MVP covers</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">
              A complete loan flow, kept intentionally clear.
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500">
              Every feature supports the scored assessment path: a borrower starts the application, operations teams own their stage, and
              the system keeps the loan state and money movement consistent.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {highlights.map((item, index) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-black ${index === 1 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-brand'}`}
                >
                  0{index + 1}
                </span>
                <h3 className="mt-5 font-black text-ink">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white/70">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="eyebrow">How it works</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">One handoff at a time.</h2>
                <p className="mt-4 max-w-md text-base leading-7 text-slate-500">
                  The workflow makes responsibilities visible, from the first eligibility check to the final payment.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {journey.map(({ step, title, description, icon: Icon }) => (
                  <div
                    key={step}
                    className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black tracking-[0.18em] text-blue-300">{step}</span>
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-brand">
                        <Icon className="h-4 w-4" />
                      </span>
                    </div>
                    <h3 className="mt-5 text-sm font-black text-ink">{title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="eyebrow">Built for every lending role</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-ink md:text-4xl">The right view for the right responsibility.</h2>
              <p className="mt-4 max-w-md text-base leading-7 text-slate-500">
                Role checks are enforced in the API as well as the interface, so each team sees the work it owns and nothing it should not
                change.
              </p>
              <div className="mt-7 flex items-center gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm font-semibold text-slate-600">
                <UsersRound className="h-5 w-5 shrink-0 text-brand" /> Six roles, one shared loan lifecycle.
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {roles.map(([title, description], index) => (
                <div key={title} className="flex gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-soft">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black ${index === 0 || index === 5 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-brand'}`}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className="text-sm font-black text-ink">{title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-slate-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-16 lg:px-10 lg:pb-24">
          <div className="relative overflow-hidden rounded-[2rem] bg-ink px-6 py-10 text-white shadow-2xl shadow-blue-900/10 md:px-10 md:py-12">
            <div className="absolute -right-20 -top-32 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl" />
            <div className="relative flex flex-col justify-between gap-8 md:flex-row md:items-center">
              <div className="max-w-2xl">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-300">Ready to explore CreditSea?</p>
                <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
                  Start with a borrower application or open the operations workspace.
                </h2>
                <p className="mt-4 text-sm leading-6 text-slate-300">
                  See the full lifecycle in action, with clear eligibility feedback, role-safe decisions, and repayment status at every
                  step.
                </p>
              </div>
              <Link href={destination} className="primary-button shrink-0 bg-white text-ink hover:bg-blue-50">
                {user ? 'Open workspace' : 'Get started'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <footer className="border-t border-slate-200/80 bg-white/60">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between lg:px-10">
            <div className="flex items-center gap-3">
              <BrandLogo className="h-6" />
              <span className="hidden text-slate-300 sm:inline">|</span>
              <span>Loan Management System MVP</span>
            </div>
            <span className="inline-flex items-center gap-2">
              <FileCheck2 className="h-4 w-4 text-brand" /> Clear decisions. Visible progress.
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
