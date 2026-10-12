'use client';

import { Eye, Trash2 } from 'lucide-react';

import { InfoTooltip, Spinner } from '@/components/ui';
import { formatCurrency, formatDate } from '@/lib/format';
import { UTR_FORMAT_HELP, UTR_REGEX } from '@/lib/validation';

import { LoanTable, PaginationControls } from './dashboard-shared';
import type {
  CollectionHistoryFilter,
  CollectionHistoryPanelProps,
  CollectionPanelProps,
  DisbursementHistoryFilter,
  DisbursementHistoryPanelProps,
  DisbursementPanelProps,
  SanctionHistoryFilter,
  SanctionHistoryPanelProps,
  SanctionPanelProps,
} from './dashboard-types';

export function SanctionPanel({
  loans,
  pagination,
  disabled,
  canDelete,
  onDelete,
  onPageChange,
  busyId,
  onApprove,
  rejectId,
  rejectReason,
  setRejectId,
  setRejectReason,
  onReject,
  onPreviewSalarySlip,
  previewLoadingId,
}: SanctionPanelProps) {
  return (
    <div>
      <LoanTable loans={loans}>
        {(loan) => (
          <div>
            {loan.status === 'SANCTION_REVIEW' && loan.reviewComment && (
              <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                <p className="font-bold">Returned by disbursement for review</p>
                <p className="mt-1 leading-5">{loan.reviewComment}</p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              {rejectId === loan.id ? (
                <form onSubmit={onReject} className="flex w-full flex-col gap-2 sm:flex-row">
                  <textarea
                    className="field mt-0 min-h-20 flex-1 resize-y"
                    value={rejectReason}
                    onChange={(event) => setRejectReason(event.target.value)}
                    placeholder="Reason for rejection"
                    maxLength={500}
                    required
                  />
                  <button className="primary-button bg-rose-600 hover:bg-rose-700" disabled={busyId !== null}>
                    {busyId !== null && <Spinner className="h-3.5 w-3.5" />}
                    {busyId !== null ? 'Saving\u2026' : 'Confirm rejection'}
                  </button>
                  <button type="button" className="secondary-button" disabled={busyId !== null} onClick={() => setRejectId(null)}>
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busyId !== null || previewLoadingId !== null}
                    onClick={() => onPreviewSalarySlip(loan)}
                  >
                    {previewLoadingId === loan.id ? <Spinner className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    {previewLoadingId === loan.id ? 'Loading slip\u2026' : 'View salary slip'}
                  </button>
                  <button className="primary-button" disabled={busyId !== null} onClick={() => onApprove(loan.id)}>
                    {busyId !== null && <Spinner className="h-3.5 w-3.5" />}
                    {busyId !== null ? 'Saving\u2026' : 'Approve loan'}
                  </button>
                  <button className="secondary-button text-rose-600" disabled={busyId !== null} onClick={() => setRejectId(loan.id)}>
                    Reject
                  </button>
                  {canDelete && (
                    <button
                      type="button"
                      title="Delete loan application"
                      aria-label={`Delete loan application for ${loan.borrower?.fullName ?? 'borrower'}`}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busyId !== null}
                      onClick={() => onDelete(loan.id, loan.borrower?.fullName ?? 'Borrower')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete application
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </LoanTable>
      <PaginationControls pagination={pagination} disabled={disabled} onPageChange={onPageChange} />
    </div>
  );
}

export function SanctionHistoryPanel({
  loans,
  pagination,
  disabled,
  canDelete,
  onDelete,
  busyId,
  filter,
  onFilterChange,
  onPageChange,
  onPreviewSalarySlip,
  previewLoadingId,
}: SanctionHistoryPanelProps) {
  const filters: Array<{ value: SanctionHistoryFilter; label: string }> = [
    { value: 'ALL', label: 'All history' },
    { value: 'SANCTIONED', label: 'Sanctioned' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'DISBURSED', label: 'Disbursed' },
    { value: 'CLOSED', label: 'Closed' },
  ];
  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            onClick={() => onFilterChange(item.value)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${filter === item.value ? 'bg-ink text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <LoanTable loans={loans}>
        {(loan) => (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div>
              {loan.status === 'REJECTED' ? (
                <p>
                  <span className="font-bold text-rose-700">Rejection reason:</span> {loan.rejectionReason ?? 'No reason provided.'}
                </p>
              ) : (
                <p>
                  <span className="font-bold text-ink">Decision recorded:</span>{' '}
                  {loan.sanctionedAt ? formatDate(loan.sanctionedAt) : 'Date unavailable'}
                </p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="secondary-button px-3 py-2 text-xs"
                disabled={busyId !== null || previewLoadingId !== null}
                onClick={() => onPreviewSalarySlip(loan)}
              >
                {previewLoadingId === loan.id ? <Spinner className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {previewLoadingId === loan.id ? 'Loading slip\u2026' : 'View salary slip'}
              </button>
              {canDelete && loan.status === 'REJECTED' && (
                <button
                  type="button"
                  title="Delete rejected loan application"
                  aria-label={`Delete rejected application for ${loan.borrower?.fullName ?? 'borrower'}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:-translate-y-0.5 hover:bg-rose-100 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busyId !== null}
                  onClick={() => onDelete(loan.id, loan.borrower?.fullName ?? 'Borrower')}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete application
                </button>
              )}
            </div>
          </div>
        )}
      </LoanTable>
      <PaginationControls pagination={pagination} disabled={disabled} onPageChange={onPageChange} />
    </div>
  );
}

export function DisbursementPanel({
  loans,
  pagination,
  disabled,
  onPageChange,
  busyId,
  onDisburse,
  onPreviewSalarySlip,
  previewLoadingId,
  reviewId,
  reviewReason,
  setReviewId,
  setReviewReason,
  disbursementReviewMode,
  setDisbursementReviewMode,
  onSendForSanctionReview,
}: DisbursementPanelProps) {
  return (
    <div>
      <LoanTable loans={loans}>
        {(loan) => (
          <div className="mt-5">
            {reviewId === loan.id ? (
              <form onSubmit={onSendForSanctionReview} className="space-y-3 rounded-2xl border border-orange-100 bg-orange-50 p-4">
                <div>
                  <p className="text-sm font-bold text-orange-900">
                    {disbursementReviewMode === 'REJECT' ? 'Reject loan application' : 'Send back for sanction review'}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-orange-800">
                    {disbursementReviewMode === 'REJECT'
                      ? 'Add the rejection comment. The borrower will be able to correct the issue and apply again.'
                      : 'Add the issue that the sanctioner must review. This comment will be visible to the borrower.'}
                  </p>
                </div>
                <textarea
                  className="field min-h-24 resize-y bg-white"
                  value={reviewReason}
                  onChange={(event) => setReviewReason(event.target.value)}
                  placeholder={
                    disbursementReviewMode === 'REJECT'
                      ? 'Explain why this loan cannot be disbursed.'
                      : 'Explain what needs to be corrected before disbursement.'
                  }
                  maxLength={500}
                  required
                />
                <div className="flex flex-wrap gap-2">
                  <button className="primary-button bg-orange-600 hover:bg-orange-700" disabled={busyId !== null}>
                    {busyId !== null && <Spinner className="h-3.5 w-3.5" />}
                    {busyId !== null
                      ? 'Saving\u2026'
                      : disbursementReviewMode === 'REJECT'
                        ? 'Confirm rejection'
                        : 'Send for sanction review'}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busyId !== null}
                    onClick={() => {
                      setReviewId(null);
                      setReviewReason('');
                      setDisbursementReviewMode('SANCTION_REVIEW');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busyId !== null || previewLoadingId !== null}
                  onClick={() => onPreviewSalarySlip(loan)}
                >
                  {previewLoadingId === loan.id ? <Spinner className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  {previewLoadingId === loan.id ? 'Loading slip\u2026' : 'View salary slip'}
                </button>
                <button className="primary-button" disabled={busyId !== null} onClick={() => onDisburse(loan.id)}>
                  {busyId !== null && <Spinner className="h-3.5 w-3.5" />}
                  {busyId !== null ? 'Saving\u2026' : 'Mark as disbursed'}
                </button>
                <button
                  type="button"
                  className="secondary-button text-orange-700"
                  disabled={busyId !== null}
                  onClick={() => {
                    setReviewReason('');
                    setDisbursementReviewMode('SANCTION_REVIEW');
                    setReviewId(loan.id);
                  }}
                >
                  Send for sanction review
                </button>
                <button
                  type="button"
                  className="secondary-button text-rose-600"
                  disabled={busyId !== null}
                  onClick={() => {
                    setReviewReason('');
                    setDisbursementReviewMode('REJECT');
                    setReviewId(loan.id);
                  }}
                >
                  Reject loan
                </button>
              </div>
            )}
          </div>
        )}
      </LoanTable>
      <PaginationControls pagination={pagination} disabled={disabled} onPageChange={onPageChange} />
    </div>
  );
}

export function DisbursementHistoryPanel({
  loans,
  pagination,
  disabled,
  filter,
  onFilterChange,
  onPageChange,
  onPreviewSalarySlip,
  previewLoadingId,
}: DisbursementHistoryPanelProps) {
  const filters: Array<{ value: DisbursementHistoryFilter; label: string }> = [
    { value: 'ALL', label: 'All history' },
    { value: 'SANCTION_REVIEW', label: 'Sanction review' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'DISBURSED', label: 'Disbursed' },
    { value: 'CLOSED', label: 'Closed' },
  ];
  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            onClick={() => onFilterChange(item.value)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${filter === item.value ? 'bg-ink text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <LoanTable loans={loans}>
        {(loan) => (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <div>
              <p>
                <span className="font-bold text-ink">
                  {loan.status === 'REJECTED'
                    ? 'Rejection comment:'
                    : loan.status === 'SANCTION_REVIEW'
                      ? 'Review comment:'
                      : 'Disbursement status:'}
                </span>{' '}
                {loan.status === 'REJECTED'
                  ? (loan.rejectionReason ?? 'No reason provided.')
                  : loan.status === 'SANCTION_REVIEW'
                    ? (loan.reviewComment ?? 'Returned to sanction for another review.')
                    : loan.status === 'CLOSED'
                      ? 'Loan fully repaid after disbursement.'
                      : 'Funds marked as disbursed.'}
              </p>
              {loan.disbursedAt && <p className="mt-1 text-xs text-slate-500">Disbursed on {formatDate(loan.disbursedAt)}</p>}
            </div>
            <button
              type="button"
              className="secondary-button px-3 py-2 text-xs"
              disabled={disabled || previewLoadingId !== null}
              onClick={() => onPreviewSalarySlip(loan)}
            >
              {previewLoadingId === loan.id ? <Spinner className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {previewLoadingId === loan.id ? 'Loading slip\u2026' : 'View salary slip'}
            </button>
          </div>
        )}
      </LoanTable>
      <PaginationControls pagination={pagination} disabled={disabled} onPageChange={onPageChange} />
    </div>
  );
}

export function CollectionHistoryPanel({ loans, pagination, disabled, filter, onFilterChange, onPageChange }: CollectionHistoryPanelProps) {
  const filters: Array<{ value: CollectionHistoryFilter; label: string }> = [
    { value: 'ALL', label: 'All records' },
    { value: 'DISBURSED', label: 'Active repayments' },
    { value: 'CLOSED', label: 'Closed loans' },
  ];
  return (
    <div>
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            disabled={disabled}
            onClick={() => onFilterChange(item.value)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${filter === item.value ? 'bg-ink text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <LoanTable loans={loans}>
        {(loan) => (
          <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold text-ink">Recorded payments</p>
              <p className="text-xs font-bold text-slate-500">
                {loan.payments.length} {loan.payments.length === 1 ? 'record' : 'records'}
              </p>
            </div>
            <div className="mt-3 space-y-2">
              {loan.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="font-bold text-ink">{payment.utr}</p>
                    <p className="text-xs text-slate-500">Payment date {formatDate(payment.paymentDate)}</p>
                  </div>
                  <p className="font-black text-blue-600">{formatCurrency(payment.amount)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </LoanTable>
      <PaginationControls pagination={pagination} disabled={disabled} onPageChange={onPageChange} />
    </div>
  );
}

export function CollectionPanel({
  loans,
  pagination,
  disabled,
  onPageChange,
  busyId,
  fields,
  onFieldChange,
  onSubmit,
}: CollectionPanelProps) {
  return (
    <div>
      <LoanTable loans={loans}>
        {(loan) => {
          const current = fields[loan.id] ?? { utr: '', amount: '', paymentDate: new Date().toISOString().slice(0, 10) };
          const hasPreviousPayment = loan.totalPaid > 0;
          const enteredAmount = Number(current.amount);
          const amountExceedsOutstanding =
            current.amount !== '' && Number.isFinite(enteredAmount) && enteredAmount > loan.outstandingBalance;

          return (
            <div>
              {hasPreviousPayment && (
                <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
                  <p className="text-sm font-bold text-blue-800">Partial payment recorded</p>
                  <p className="mt-1 text-xs leading-5 text-blue-700">
                    {formatCurrency(loan.totalPaid)} has been paid toward the total repayment. The remaining balance is{' '}
                    <span className="font-bold">{formatCurrency(loan.outstandingBalance)}</span>. You can record another payment below.
                  </p>
                </div>
              )}
              <form
                onSubmit={(event) => onSubmit(event, loan)}
                className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-[1fr_1fr_1fr_auto]"
              >
                <label className="text-xs font-bold text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    UTR{' '}
                    <InfoTooltip id={`utr-format-tooltip-${loan.id}`} label="UTR format help">
                      {UTR_FORMAT_HELP}
                    </InfoTooltip>
                  </span>
                  <input
                    className="field"
                    value={current.utr}
                    onChange={(event) => onFieldChange(loan.id, 'utr', event.target.value.toUpperCase())}
                    placeholder="DEMO-UTR-001"
                    pattern={UTR_REGEX.source}
                    minLength={6}
                    maxLength={30}
                    title={UTR_FORMAT_HELP}
                    autoComplete="off"
                    required
                  />
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Amount
                  <input
                    className={`field ${amountExceedsOutstanding ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-100' : ''}`}
                    type="number"
                    min="0.01"
                    max={loan.outstandingBalance}
                    step="0.01"
                    value={current.amount}
                    onChange={(event) => onFieldChange(loan.id, 'amount', event.target.value)}
                    placeholder={String(loan.outstandingBalance)}
                    aria-invalid={amountExceedsOutstanding}
                    aria-describedby={`payment-amount-help-${loan.id}`}
                    required
                  />
                  <span
                    id={`payment-amount-help-${loan.id}`}
                    className={`mt-1 block font-normal ${amountExceedsOutstanding ? 'text-rose-600' : 'text-slate-400'}`}
                  >
                    {amountExceedsOutstanding
                      ? `Cannot exceed ${formatCurrency(loan.outstandingBalance)}.`
                      : `Maximum ${formatCurrency(loan.outstandingBalance)}.`}
                  </span>
                </label>
                <label className="text-xs font-bold text-slate-500">
                  Payment date
                  <input
                    className="field"
                    type="date"
                    value={current.paymentDate}
                    onChange={(event) => onFieldChange(loan.id, 'paymentDate', event.target.value)}
                    required
                  />
                </label>
                <button className="primary-button self-end" disabled={busyId !== null}>
                  {busyId !== null && <Spinner className="h-3.5 w-3.5" />}
                  {busyId !== null ? 'Saving\u2026' : hasPreviousPayment ? 'Record another payment' : 'Record payment'}
                </button>
              </form>
            </div>
          );
        }}
      </LoanTable>
      <PaginationControls pagination={pagination} disabled={disabled} onPageChange={onPageChange} />
    </div>
  );
}
