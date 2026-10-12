'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { CalendarDays, Check, Clock3, Eye, FileCheck2, FileText, IndianRupee, Sparkles, WalletCards } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { UnauthorizedState } from '@/components/access-state';
import { useToast } from '@/components/toast';
import { Card, CreditSeaLoader, EmptyState, ErrorMessage, SectionHeading, StatusBadge } from '@/components/ui';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ApiError, apiFetch, apiFetchBlob } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate, formatLoanStatus } from '@/lib/format';
import { Loan, LoanStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

const stages: LoanStatus[] = ['APPLIED', 'SANCTIONED', 'DISBURSED', 'CLOSED'];

function PreviewFrame({ url, mimeType, className = '' }: { url: string; mimeType: string; className?: string }) {
  if (mimeType === 'application/pdf') {
    return <iframe title="Salary slip document" src={url} className={cn('w-full bg-white', className)} />;
  }
  return <img src={url} alt="Salary slip" className={cn('w-full object-contain', className)} />;
}

function LoanProgress({ status }: { status: LoanStatus }) {
  const currentIndex = status === 'REJECTED' ? -1 : stages.indexOf(status);

  return (
    <div className="grid gap-4 sm:grid-cols-4">
      {stages.map((stage, index) => {
        const reached = index <= currentIndex;
        return (
          <div key={stage} className="relative flex items-center gap-3 sm:block">
            {index < stages.length - 1 && (
              <div
                className={cn(
                  'absolute left-9 top-4 hidden h-px w-[calc(100%-1.5rem)] sm:block',
                  index < currentIndex ? 'bg-ink' : 'bg-slate-200',
                )}
              />
            )}
            <div
              className={cn(
                'relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black transition-all duration-500',
                reached ? 'bg-ink text-white shadow-lg shadow-ink/20' : 'bg-slate-100 text-slate-400',
              )}
            >
              {reached ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="sm:mt-3">
              <p className={cn('text-xs font-bold', reached ? 'text-ink' : 'text-slate-600')}>{formatLoanStatus(stage)}</p>
              <p className="mt-1 hidden text-[11px] text-slate-500 sm:block">
                {stage === 'APPLIED'
                  ? 'Submitted'
                  : stage === 'SANCTIONED'
                    ? 'Reviewed'
                    : stage === 'DISBURSED'
                      ? 'Funds released'
                      : 'Fully repaid'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function BorrowerLoanPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loadingLoan, setLoadingLoan] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [salarySlipPreviewUrl, setSalarySlipPreviewUrl] = useState<string | null>(null);
  const [salarySlipMimeType, setSalarySlipMimeType] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'BORROWER') return;
    apiFetch<{ loan: Loan }>('/borrower/loans/current')
      .then(({ loan: currentLoan }) => setLoan(currentLoan))
      .catch((requestError) => {
        if (!(requestError instanceof ApiError && requestError.status === 404)) {
          const message = requestError instanceof ApiError ? requestError.message : 'Unable to load your loan.';
          setError(message);
          toast.error(message);
        }
      })
      .finally(() => setLoadingLoan(false));
  }, [user]);

  useEffect(() => {
    if (!loan) return;
    let mounted = true;
    let previewUrl: string | null = null;
    setLoadingPreview(true);
    apiFetchBlob('/borrower/loans/current/salary-slip')
      .then((blob) => {
        const nextPreviewUrl = URL.createObjectURL(blob);
        if (!mounted) {
          URL.revokeObjectURL(nextPreviewUrl);
          return;
        }
        previewUrl = nextPreviewUrl;
        setSalarySlipMimeType(blob.type || loan.salarySlip?.mimeType || null);
        setSalarySlipPreviewUrl(nextPreviewUrl);
      })
      .catch((requestError) => {
        setSalarySlipMimeType(null);
        setSalarySlipPreviewUrl(null);
        const message = requestError instanceof ApiError ? requestError.message : 'Salary slip preview is unavailable.';
        toast.error(message);
      })
      .finally(() => setLoadingPreview(false));

    return () => {
      mounted = false;
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [loan]);

  if (!loading && user && user.role !== 'BORROWER') {
    return (
      <AppShell>
        <UnauthorizedState
          title="This is the borrower loan view"
          description="Your account is an operations role, so borrower loan details are not available here. Open your operations workspace to continue."
          actionHref="/dashboard"
          actionLabel="Open operations workspace"
        />
      </AppShell>
    );
  }

  const previewMimeType = salarySlipMimeType ?? loan?.salarySlip?.mimeType ?? '';

  return (
    <AppShell>
      <SectionHeading
        eyebrow="Borrower portal"
        title="My loan"
        description="Track your application, repayment balance, and submitted documents in one place."
      />
      <ErrorMessage message={error} />
      {loadingLoan ? (
        <CreditSeaLoader label="Loading your loan…" variant="panel" />
      ) : !loan ? (
        <EmptyState
          title="No loan application yet"
          description="Complete your borrower profile and submit an application to see it here."
          action={
            <Link href="/borrower/apply" className="primary-button">
              Start an application
            </Link>
          }
        />
      ) : (
        <div className="space-y-6">
          <Card className="relative overflow-hidden border-0 !bg-ink p-6 !text-white shadow-xl shadow-ink/10 md:p-8">
            <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="relative flex flex-wrap items-start justify-between gap-6">
              <div>
                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">
                  <Sparkles className="h-4 w-4" /> Loan overview
                </div>
                <p className="text-sm text-slate-100">Application submitted {formatDate(loan.createdAt)}</p>
                <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">{formatCurrency(loan.amount)}</h2>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-100">
                  <span className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-blue-200" /> {loan.tenureDays} days
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <IndianRupee className="h-4 w-4 text-blue-200" /> {loan.interestRate}% annual interest
                  </span>
                </div>
              </div>
              <StatusBadge status={loan.status} />
            </div>
            {loan.status === 'REJECTED' && (
              <div className="relative mt-6 rounded-2xl border border-rose-300/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                <strong>Application rejected:</strong> {loan.rejectionReason ?? 'No reason provided.'}
              </div>
            )}
            <div className="relative mt-9 rounded-2xl border border-white/20 bg-white p-5 shadow-lg shadow-black/10">
              <LoanProgress status={loan.status} />
            </div>
          </Card>

          <div className="grid items-stretch gap-6 lg:grid-cols-2">
            <Card className="flex h-full min-h-[430px] flex-col p-6 md:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <WalletCards className="h-5 w-5" />
                  </div>
                  <h2 className="text-lg font-bold text-ink">Repayment summary</h2>
                  <p className="mt-1 text-sm text-slate-500">A clear view of your repayment position.</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">12% p.a.</span>
              </div>
              <div className="mt-7 flex-1 space-y-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Principal</span>
                  <span className="font-semibold text-ink">{formatCurrency(loan.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Simple interest</span>
                  <span className="font-semibold text-ink">{formatCurrency(loan.simpleInterest)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-100 pt-4">
                  <span className="font-semibold text-ink">Total repayment</span>
                  <span className="font-black text-ink">{formatCurrency(loan.totalRepayment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Paid so far</span>
                  <span className="font-semibold text-emerald-600">{formatCurrency(loan.totalPaid)}</span>
                </div>
              </div>
              <div className="mt-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Outstanding balance</p>
                <p className="mt-2 text-3xl font-black tracking-tight text-ink">{formatCurrency(loan.outstandingBalance)}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all duration-700"
                    style={{ width: `${Math.min((loan.totalPaid / loan.totalRepayment) * 100, 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {loan.status === 'CLOSED' ? 'Your loan is fully repaid.' : 'Your balance updates after each recorded payment.'}
                </p>
              </div>
            </Card>

            <Card className="flex h-full min-h-[430px] flex-col p-6 md:p-7">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                  <FileCheck2 className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-ink">Application details</h2>
                  <p className="mt-1 text-sm text-slate-500">Your submitted loan document and timeline.</p>
                </div>
              </div>
              <dl className="mt-6 space-y-4 text-sm">
                <div className="flex items-center justify-between gap-5">
                  <dt className="text-slate-500">Salary slip</dt>
                  <dd className="max-w-[62%] truncate text-right font-semibold text-ink">{loan.salarySlip?.originalName ?? '—'}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="inline-flex items-center gap-2 text-slate-500">
                    <CalendarDays className="h-4 w-4" /> Sanctioned on
                  </dt>
                  <dd className="font-semibold text-ink">{formatDate(loan.sanctionedAt)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Disbursed on</dt>
                  <dd className="font-semibold text-ink">{formatDate(loan.disbursedAt)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-slate-500">Closed on</dt>
                  <dd className="font-semibold text-ink">{formatDate(loan.closedAt)}</dd>
                </div>
              </dl>
              <div className="mt-6 flex-1 border-t border-slate-100 pt-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink">Salary slip preview</h3>
                    <p className="mt-1 text-xs text-slate-500">Click preview to inspect the full document.</p>
                  </div>
                  {salarySlipPreviewUrl && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                      {previewMimeType === 'application/pdf' ? 'PDF' : 'Image'}
                    </span>
                  )}
                </div>
                {loadingPreview ? (
                  <CreditSeaLoader label="Loading salary slip preview…" variant="compact" className="mt-4" />
                ) : salarySlipPreviewUrl ? (
                  <div className="group relative mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    <PreviewFrame
                      url={salarySlipPreviewUrl}
                      mimeType={previewMimeType}
                      className="pointer-events-none h-36 object-cover opacity-90 transition duration-500 group-hover:scale-[1.02]"
                    />
                    <button
                      type="button"
                      onClick={() => setPreviewOpen(true)}
                      className="absolute inset-0 flex items-center justify-center bg-ink/0 text-white opacity-0 transition-all duration-300 hover:bg-ink/45 hover:opacity-100 focus:bg-ink/45 focus:opacity-100 focus:outline-none focus:ring-4 focus:ring-blue-200"
                    >
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-ink shadow-xl">
                        <Eye className="h-4 w-4" /> Preview slip
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex h-36 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
                    <FileText className="mr-2 h-4 w-4" /> Preview unavailable
                  </div>
                )}
              </div>
            </Card>
          </div>

          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-5xl p-4 sm:p-6">
              <DialogHeader className="px-2 pt-1">
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-600" /> Salary slip preview
                </DialogTitle>
                <DialogDescription>
                  {loan.salarySlip?.originalName ?? 'Submitted salary slip'} · Only you can access this document.
                </DialogDescription>
              </DialogHeader>
              {salarySlipPreviewUrl && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                  <PreviewFrame url={salarySlipPreviewUrl} mimeType={previewMimeType} className="h-[min(68vh,720px)] object-contain" />
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </AppShell>
  );
}
