'use client';

import { CalendarDays, ChevronDown, FileText, LockKeyhole, Mail, Search, ShieldCheck, Trash2, UsersRound, X } from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, EmptyState, StatusBadge } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import type { Lead, Loan, PaginationMeta } from '@/lib/types';

import type { DashboardPaginationProps, LoanTableProps, SalesPanelProps, SalarySlipPreview, SearchFieldConfig } from './dashboard-types';

export function SalarySlipPreviewDialog({
  preview,
  onOpenChange,
}: {
  preview: SalarySlipPreview | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={preview !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-4 sm:p-6">
        <DialogHeader className="px-2 pt-1">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" /> Salary slip preview
          </DialogTitle>
          <DialogDescription>
            {preview?.originalName ?? 'Submitted salary slip'} &middot; Protected operations preview; the stored file URL is not exposed.
          </DialogDescription>
        </DialogHeader>
        {preview && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <SalarySlipPreviewFrame url={preview.url} mimeType={preview.mimeType} className="h-[min(68vh,720px)] object-contain" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function SalarySlipPreviewFrame({ url, mimeType, className = '' }: { url: string; mimeType: string; className?: string }) {
  if (mimeType === 'application/pdf') {
    return <iframe title="Salary slip document" src={url} className={`w-full bg-white ${className}`} />;
  }
  return <img src={url} alt="Salary slip" className={`w-full object-contain ${className}`} />;
}

export function SearchField({ config, value, onChange }: { config: SearchFieldConfig; value: string; onChange: (value: string) => void }) {
  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <label className="block text-sm font-bold text-ink" htmlFor="operations-search">
        {config.label}
      </label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
        <input
          id="operations-search"
          className="field mt-0 pl-10 pr-10"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={config.placeholder}
          maxLength={100}
          autoComplete="off"
        />
        {value && (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-ink"
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-slate-500">{config.help} Search is applied automatically.</p>
    </div>
  );
}

export function AdminControlsPanel() {
  return (
    <details className="mt-8 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-soft">
      <summary className="group cursor-pointer list-none px-5 py-5 outline-none transition hover:bg-blue-50/40 focus-visible:ring-4 focus-visible:ring-blue-100 [&::-webkit-details-marker]:hidden md:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">Administration</p>
              <h2 className="mt-1 font-bold text-ink">Administrator controls</h2>
              <p className="mt-1 text-sm text-slate-500">Optional cleanup actions for non-financial records.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700">Admin only</span>
            <ChevronDown className="h-5 w-5 text-slate-400 transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </div>
        </div>
      </summary>
      <div className="border-t border-blue-100/80 bg-gradient-to-br from-white via-white to-blue-50/70 p-5 md:p-6">
        <p className="text-sm leading-6 text-slate-500">
          Use these cleanup options only when a record was created in error. Every deletion is restricted to non-financial records and
          requires confirmation.
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <UsersRound className="h-4 w-4 text-blue-600" />
              <h3 className="text-sm font-bold text-ink">Delete a borrower</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              Open the Sales module and use the <span className="font-bold text-ink">Actions</span> column on a borrower lead.
            </p>
            <p className="mt-3 text-xs font-bold text-emerald-700">Allowed: no loan history</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-rose-600" />
              <h3 className="text-sm font-bold text-ink">Delete a loan application</h3>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-500">
              Open Sanction and use <span className="font-bold text-ink">Delete application</span> for an applied, sanction-review, or
              rejected record.
            </p>
            <p className="mt-3 text-xs font-bold text-emerald-700">Allowed: no payment history</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs leading-5 text-slate-500">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
          <p>Disbursed, closed, paid, and payment records are protected. The server enforces the same rules even if the UI is bypassed.</p>
        </div>
      </div>
    </details>
  );
}

export function PaginationControls({ pagination, disabled, onPageChange }: DashboardPaginationProps) {
  if (!pagination || pagination.total === 0) return null;
  const firstItem = (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-slate-500">
        Showing{' '}
        <span className="font-bold text-ink">
          {firstItem}&ndash;{lastItem}
        </span>{' '}
        of <span className="font-bold text-ink">{pagination.total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={disabled || !pagination.hasPreviousPage}
          onClick={() => onPageChange(pagination.page - 1)}
          className="secondary-button px-3 py-2 text-xs"
        >
          Previous
        </button>
        <span className="min-w-20 text-center text-xs font-bold text-slate-500">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        <button
          type="button"
          disabled={disabled || !pagination.hasNextPage}
          onClick={() => onPageChange(pagination.page + 1)}
          className="secondary-button px-3 py-2 text-xs"
        >
          Next
        </button>
      </div>
    </div>
  );
}

export function SalesPanel({ leads, pagination, disabled, canDelete, onDelete, onPageChange }: SalesPanelProps) {
  if (!leads.length)
    return (
      <div className="mt-6">
        <EmptyState title="No open leads" description="Every registered borrower currently has a loan application." />
      </div>
    );
  return (
    <div className="mt-6">
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 bg-gradient-to-r from-white via-white to-blue-50/60 px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
                <UsersRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-ink">Open leads</h2>
                <p className="mt-0.5 text-sm text-slate-500">Reach out to borrowers who have not applied yet.</p>
              </div>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
              {pagination?.total ?? leads.length} {pagination?.total === 1 ? 'lead' : 'leads'}
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
              <tr>
                <th className="px-5 py-3.5 md:px-6">Borrower</th>
                <th className="px-5 py-3.5 md:px-6">Email</th>
                <th className="px-5 py-3.5 md:px-6">Profile</th>
                <th className="px-5 py-3.5 md:px-6">Registered</th>
                {canDelete && <th className="px-5 py-3.5 text-right md:px-6">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((lead) => {
                const borrowerName = lead.fullName?.trim() || 'User';
                return (
                  <tr key={lead.id} className="group transition-colors hover:bg-blue-50/35">
                    <td className="px-5 py-4 md:px-6">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-600 transition-colors group-hover:bg-blue-100 group-hover:text-blue-700">
                          {borrowerName.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <p className="font-bold text-ink">{borrowerName}</p>
                          <p className="mt-0.5 text-xs text-slate-400">Borrower</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 md:px-6">
                      <a
                        href={`mailto:${encodeURIComponent(lead.email)}`}
                        className="-ml-2 inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                        aria-label={`Email ${borrowerName}`}
                      >
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">{lead.email}</span>
                      </a>
                    </td>
                    <td className="px-5 py-4 md:px-6">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${lead.profileCompleted ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/15' : 'bg-slate-100 text-slate-500 ring-1 ring-inset ring-slate-200'}`}
                      >
                        {lead.profileCompleted ? 'Complete' : 'Incomplete'}
                      </span>
                    </td>
                    <td className="px-5 py-4 md:px-6">
                      <span className="inline-flex items-center gap-2 text-slate-500">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {formatDate(lead.createdAt)}
                      </span>
                    </td>
                    {canDelete && (
                      <td className="px-5 py-4 text-right md:px-6">
                        <button
                          type="button"
                          title="Delete borrower"
                          aria-label={`Delete borrower ${borrowerName}`}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          disabled={disabled}
                          onClick={() => onDelete(lead.id, borrowerName)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete borrower
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <PaginationControls pagination={pagination} disabled={disabled} onPageChange={onPageChange} />
    </div>
  );
}

export function LoanTable<T extends Loan>({ loans, children }: LoanTableProps<T>) {
  if (!loans.length)
    return (
      <div className="mt-6">
        <EmptyState title="Nothing to review" description="There are no loans in this module right now." />
      </div>
    );
  return (
    <div className="mt-6 space-y-4">
      {loans.map((loan) => (
        <Card key={loan.id} className="p-5 md:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500">
                {loan.borrower?.fullName ?? 'Borrower'}{' '}
                <span className="px-1 text-slate-300" aria-hidden="true">
                  &bull;
                </span>{' '}
                {loan.borrower?.email ?? 'Email unavailable'}
              </p>
              <h2 className="mt-2 text-lg font-black text-ink">{formatCurrency(loan.amount)}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Applied on {formatDate(loan.createdAt)}{' '}
                <span className="px-1 text-slate-300" aria-hidden="true">
                  &bull;
                </span>{' '}
                {loan.tenureDays}-day term{' '}
                <span className="px-1 text-slate-300" aria-hidden="true">
                  &bull;
                </span>{' '}
                Total repayment {formatCurrency(loan.totalRepayment)}
              </p>
            </div>
            <StatusBadge status={loan.status} />
          </div>
          <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-400">Interest amount</p>
              <p className="mt-1 font-bold text-ink">{formatCurrency(loan.simpleInterest)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Total paid</p>
              <p className="mt-1 font-bold text-ink">{formatCurrency(loan.totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Outstanding balance</p>
              <p className="mt-1 font-bold text-blue-600">{formatCurrency(loan.outstandingBalance)}</p>
            </div>
          </div>
          {children?.(loan)}
        </Card>
      ))}
    </div>
  );
}
