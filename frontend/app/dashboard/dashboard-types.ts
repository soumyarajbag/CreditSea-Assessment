import type { FormEvent, ReactNode } from 'react';

import type { CollectionHistoryLoan, Lead, Loan, PaginationMeta, Role } from '@/lib/types';

export type ModuleName = 'sales' | 'sanction' | 'disbursement' | 'collection';
export type SanctionView = 'pending' | 'history';
export type DisbursementView = 'pending' | 'history';
export type CollectionView = 'pending' | 'history';
export type SanctionHistoryFilter = 'ALL' | 'SANCTIONED' | 'REJECTED' | 'DISBURSED' | 'CLOSED';
export type DisbursementHistoryFilter = 'ALL' | 'SANCTION_REVIEW' | 'REJECTED' | 'DISBURSED' | 'CLOSED';
export type CollectionHistoryFilter = 'ALL' | 'DISBURSED' | 'CLOSED';
export type SearchScope =
  | 'sales'
  | 'sanctionPending'
  | 'sanctionHistory'
  | 'disbursementPending'
  | 'disbursementHistory'
  | 'collectionPending'
  | 'collectionHistory';
export type SearchFieldConfig = { label: string; placeholder: string; help: string };
export type DeleteTarget = {
  kind: 'borrower' | 'loan';
  id: string;
  subject: string;
  description: string;
  restriction: string;
};
export type LoadContext = { id: number; key: string };
export type SalarySlipPreview = { url: string; mimeType: string; originalName: string };
export type PaymentField = 'utr' | 'amount' | 'paymentDate';
export type PaymentFields = Record<string, { utr: string; amount: string; paymentDate: string }>;
export type LoanTableRenderer<T extends Loan> = (loan: T) => ReactNode;

export type DashboardPaginationProps = {
  pagination: PaginationMeta | null;
  disabled: boolean;
  onPageChange: (page: number) => void;
};

export type SalesPanelProps = DashboardPaginationProps & {
  leads: Lead[];
  canDelete: boolean;
  onDelete: (id: string, borrowerName: string) => void;
};

export type LoanTableProps<T extends Loan = Loan> = {
  loans: T[];
  children?: LoanTableRenderer<T>;
};

export type SanctionPanelProps = DashboardPaginationProps & {
  loans: Loan[];
  canDelete: boolean;
  onDelete: (id: string, borrowerName: string) => void;
  busyId: string | null;
  onApprove: (id: string) => void;
  rejectId: string | null;
  rejectReason: string;
  setRejectId: (id: string | null) => void;
  setRejectReason: (reason: string) => void;
  onReject: (event: FormEvent<HTMLFormElement>) => void;
  onPreviewSalarySlip: (loan: Loan) => void;
  previewLoadingId: string | null;
};

export type SanctionHistoryPanelProps = DashboardPaginationProps & {
  loans: Loan[];
  canDelete: boolean;
  onDelete: (id: string, borrowerName: string) => void;
  busyId: string | null;
  filter: SanctionHistoryFilter;
  onFilterChange: (filter: SanctionHistoryFilter) => void;
  onPreviewSalarySlip: (loan: Loan) => void;
  previewLoadingId: string | null;
};

export type DisbursementPanelProps = DashboardPaginationProps & {
  loans: Loan[];
  busyId: string | null;
  onDisburse: (id: string) => void;
  onPreviewSalarySlip: (loan: Loan) => void;
  previewLoadingId: string | null;
  reviewId: string | null;
  reviewReason: string;
  setReviewId: (id: string | null) => void;
  setReviewReason: (reason: string) => void;
  disbursementReviewMode: 'REJECT' | 'SANCTION_REVIEW';
  setDisbursementReviewMode: (mode: 'REJECT' | 'SANCTION_REVIEW') => void;
  onSendForSanctionReview: (event: FormEvent<HTMLFormElement>) => void;
};

export type DisbursementHistoryPanelProps = DashboardPaginationProps & {
  loans: Loan[];
  filter: DisbursementHistoryFilter;
  onFilterChange: (filter: DisbursementHistoryFilter) => void;
  onPreviewSalarySlip: (loan: Loan) => void;
  previewLoadingId: string | null;
};

export type CollectionHistoryPanelProps = DashboardPaginationProps & {
  loans: CollectionHistoryLoan[];
  filter: CollectionHistoryFilter;
  onFilterChange: (filter: CollectionHistoryFilter) => void;
};

export type CollectionPanelProps = DashboardPaginationProps & {
  loans: Loan[];
  busyId: string | null;
  fields: PaymentFields;
  onFieldChange: (loanId: string, field: PaymentField, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, loan: Loan) => void;
};

export type DashboardModuleMeta = { label: string; eyebrow: string; description: string };
