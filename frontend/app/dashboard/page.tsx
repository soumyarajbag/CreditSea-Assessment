'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { AlertTriangle, LockKeyhole, Trash2 } from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { UnauthorizedState } from '@/components/access-state';
import { useToast } from '@/components/toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditSeaLoader, ErrorMessage, SectionHeading } from '@/components/ui';
import { ApiError, apiFetch, apiFetchBlob } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateInputToEpoch, formatCurrency } from '@/lib/format';
import type { CollectionHistoryLoan, Lead, Loan, PaginationMeta } from '@/lib/types';
import { UTR_REGEX } from '@/lib/validation';

import { firstModuleForRole, getSearchScope, listQuery, moduleMeta, searchFieldConfig } from './dashboard-config';
import type {
  CollectionHistoryFilter,
  CollectionView,
  DeleteTarget,
  DisbursementHistoryFilter,
  DisbursementView,
  LoadContext,
  ModuleName,
  SalarySlipPreview,
  SanctionHistoryFilter,
  SanctionView,
  SearchScope,
} from './dashboard-types';
import { AdminControlsPanel, SalarySlipPreviewDialog, SalesPanel, SearchField } from './dashboard-shared';
import {
  CollectionHistoryPanel,
  CollectionPanel,
  DisbursementHistoryPanel,
  DisbursementPanel,
  SanctionHistoryPanel,
  SanctionPanel,
} from './dashboard-panels';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [activeModule, setActiveModule] = useState<ModuleName>('sales');
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsPagination, setLeadsPagination] = useState<PaginationMeta | null>(null);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loansPagination, setLoansPagination] = useState<PaginationMeta | null>(null);
  const [sanctionHistory, setSanctionHistory] = useState<Loan[]>([]);
  const [sanctionHistoryPagination, setSanctionHistoryPagination] = useState<PaginationMeta | null>(null);
  const [sanctionView, setSanctionView] = useState<SanctionView>('pending');
  const [sanctionHistoryFilter, setSanctionHistoryFilter] = useState<SanctionHistoryFilter>('ALL');
  const [sanctionHistoryPage, setSanctionHistoryPage] = useState(1);
  const [disbursementHistory, setDisbursementHistory] = useState<Loan[]>([]);
  const [disbursementHistoryPagination, setDisbursementHistoryPagination] = useState<PaginationMeta | null>(null);
  const [disbursementView, setDisbursementView] = useState<DisbursementView>('pending');
  const [disbursementHistoryFilter, setDisbursementHistoryFilter] = useState<DisbursementHistoryFilter>('ALL');
  const [disbursementHistoryPage, setDisbursementHistoryPage] = useState(1);
  const [collectionHistory, setCollectionHistory] = useState<CollectionHistoryLoan[]>([]);
  const [collectionHistoryPagination, setCollectionHistoryPagination] = useState<PaginationMeta | null>(null);
  const [collectionView, setCollectionView] = useState<CollectionView>('pending');
  const [collectionHistoryFilter, setCollectionHistoryFilter] = useState<CollectionHistoryFilter>('ALL');
  const [collectionHistoryPage, setCollectionHistoryPage] = useState(1);
  const [loansPage, setLoansPage] = useState(1);
  const [pageLoading, setPageLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');
  const [disbursementReviewMode, setDisbursementReviewMode] = useState<'REJECT' | 'SANCTION_REVIEW'>('SANCTION_REVIEW');
  const [paymentFields, setPaymentFields] = useState<Record<string, { utr: string; amount: string; paymentDate: string }>>({});
  const [searchInputByScope, setSearchInputByScope] = useState<Record<SearchScope, string>>({
    sales: '',
    sanctionPending: '',
    sanctionHistory: '',
    disbursementPending: '',
    disbursementHistory: '',
    collectionPending: '',
    collectionHistory: '',
  });
  const [searchByScope, setSearchByScope] = useState<Record<SearchScope, string>>({
    sales: '',
    sanctionPending: '',
    sanctionHistory: '',
    disbursementPending: '',
    disbursementHistory: '',
    collectionPending: '',
    collectionHistory: '',
  });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [salarySlipPreview, setSalarySlipPreview] = useState<SalarySlipPreview | null>(null);
  const [previewLoadingId, setPreviewLoadingId] = useState<string | null>(null);
  const loadSequenceRef = useRef(0);
  const activeLoadRef = useRef<LoadContext | null>(null);

  const visibleModules = useMemo<ModuleName[]>(
    () => (user?.role === 'ADMIN' ? ['sales', 'sanction', 'disbursement', 'collection'] : user ? [firstModuleForRole(user.role)] : []),
    [user],
  );
  const searchScope = getSearchScope(activeModule, sanctionView, disbursementView, collectionView);
  const activeSearchInput = searchInputByScope[searchScope];

  const beginLoad = (key: string): LoadContext | null => {
    if (activeLoadRef.current?.key === key) return null;
    const context = { id: loadSequenceRef.current + 1, key };
    loadSequenceRef.current = context.id;
    activeLoadRef.current = context;
    setPageLoading(true);
    setError(null);
    return context;
  };

  const isCurrentLoad = (context: LoadContext) => activeLoadRef.current?.id === context.id;

  const finishLoad = (context: LoadContext) => {
    if (!isCurrentLoad(context)) return;
    activeLoadRef.current = null;
    setPageLoading(false);
  };

  useEffect(() => {
    if (!loading && user && user.role !== 'ADMIN') setActiveModule(firstModuleForRole(user.role));
  }, [loading, user]);

  useEffect(() => {
    return () => {
      if (salarySlipPreview?.url) URL.revokeObjectURL(salarySlipPreview.url);
    };
  }, [salarySlipPreview]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const normalizedSearch = activeSearchInput.trim();
      setSearchByScope((current) =>
        current[searchScope] === normalizedSearch ? current : { ...current, [searchScope]: normalizedSearch },
      );
      setLoansPage(1);
      setSanctionHistoryPage(1);
      setDisbursementHistoryPage(1);
      setCollectionHistoryPage(1);
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [activeSearchInput, searchScope]);

  const loadModule = async (module: ModuleName, page = 1) => {
    const moduleSearch =
      module === 'sales'
        ? searchByScope.sales
        : module === 'sanction'
          ? searchByScope.sanctionPending
          : module === 'disbursement'
            ? searchByScope.disbursementPending
            : searchByScope.collectionPending;
    const context = beginLoad(`module:${module}:${page}:${moduleSearch}`);
    if (!context) return;
    try {
      if (module === 'sales') {
        const result = await apiFetch<{ leads: Lead[]; pagination: PaginationMeta }>(
          `/ops/sales/leads${listQuery(page, undefined, moduleSearch)}`,
        );
        if (isCurrentLoad(context)) {
          setLeads(result.leads);
          setLeadsPagination(result.pagination);
        }
      } else {
        const route =
          module === 'sanction' ? '/ops/sanction/loans' : module === 'disbursement' ? '/ops/disbursement/loans' : '/ops/collection/loans';
        const result = await apiFetch<{ loans: Loan[]; pagination: PaginationMeta }>(`${route}${listQuery(page, undefined, moduleSearch)}`);
        if (isCurrentLoad(context)) {
          setLoans(result.loans);
          setLoansPagination(result.pagination);
        }
      }
    } catch (requestError) {
      if (!isCurrentLoad(context)) return;
      const message = requestError instanceof ApiError ? requestError.message : 'Unable to load this module.';
      setError(message);
      toast.error(message);
    } finally {
      finishLoad(context);
    }
  };

  const loadSanctionHistory = async (page = 1, status?: SanctionHistoryFilter) => {
    const context = beginLoad(`sanction-history:${page}:${status ?? 'ALL'}:${searchByScope.sanctionHistory}`);
    if (!context) return;
    try {
      const result = await apiFetch<{ loans: Loan[]; pagination: PaginationMeta }>(
        `/ops/sanction/history${listQuery(page, status, searchByScope.sanctionHistory)}`,
      );
      if (isCurrentLoad(context)) {
        setSanctionHistory(result.loans);
        setSanctionHistoryPagination(result.pagination);
      }
    } catch (requestError) {
      if (!isCurrentLoad(context)) return;
      const message = requestError instanceof ApiError ? requestError.message : 'Unable to load sanction history.';
      setError(message);
      toast.error(message);
    } finally {
      finishLoad(context);
    }
  };

  const loadDisbursementHistory = async (page = 1, status?: DisbursementHistoryFilter) => {
    const context = beginLoad(`disbursement-history:${page}:${status ?? 'ALL'}:${searchByScope.disbursementHistory}`);
    if (!context) return;
    try {
      const result = await apiFetch<{ loans: Loan[]; pagination: PaginationMeta }>(
        `/ops/disbursement/history${listQuery(page, status, searchByScope.disbursementHistory)}`,
      );
      if (isCurrentLoad(context)) {
        setDisbursementHistory(result.loans);
        setDisbursementHistoryPagination(result.pagination);
      }
    } catch (requestError) {
      if (!isCurrentLoad(context)) return;
      const message = requestError instanceof ApiError ? requestError.message : 'Unable to load disbursement history.';
      setError(message);
      toast.error(message);
    } finally {
      finishLoad(context);
    }
  };

  const loadCollectionHistory = async (page = 1, status?: CollectionHistoryFilter) => {
    const context = beginLoad(`collection-history:${page}:${status ?? 'ALL'}:${searchByScope.collectionHistory}`);
    if (!context) return;
    try {
      const result = await apiFetch<{ loans: CollectionHistoryLoan[]; pagination: PaginationMeta }>(
        `/ops/collection/history${listQuery(page, status, searchByScope.collectionHistory)}`,
      );
      if (isCurrentLoad(context)) {
        setCollectionHistory(result.loans);
        setCollectionHistoryPagination(result.pagination);
      }
    } catch (requestError) {
      if (!isCurrentLoad(context)) return;
      const message = requestError instanceof ApiError ? requestError.message : 'Unable to load collection history.';
      setError(message);
      toast.error(message);
    } finally {
      finishLoad(context);
    }
  };

  const refreshCurrentView = async () => {
    if (activeModule === 'sanction' && sanctionView === 'history') {
      await loadSanctionHistory(sanctionHistoryPage, sanctionHistoryFilter);
      return;
    }
    if (activeModule === 'disbursement' && disbursementView === 'history') {
      await loadDisbursementHistory(disbursementHistoryPage, disbursementHistoryFilter);
      return;
    }
    if (activeModule === 'collection' && collectionView === 'history') {
      await loadCollectionHistory(collectionHistoryPage, collectionHistoryFilter);
      return;
    }
    await loadModule(activeModule, loansPage);
  };

  useEffect(() => {
    if (user && user.role !== 'BORROWER' && visibleModules.includes(activeModule)) {
      if (activeModule === 'sanction' && sanctionView === 'history') void loadSanctionHistory(sanctionHistoryPage, sanctionHistoryFilter);
      else if (activeModule === 'disbursement' && disbursementView === 'history')
        void loadDisbursementHistory(disbursementHistoryPage, disbursementHistoryFilter);
      else if (activeModule === 'collection' && collectionView === 'history')
        void loadCollectionHistory(collectionHistoryPage, collectionHistoryFilter);
      else void loadModule(activeModule, loansPage);
    }
    // loadModule is intentionally driven by the selected role/module.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeModule,
    collectionHistoryFilter,
    collectionHistoryPage,
    collectionView,
    disbursementHistoryFilter,
    disbursementHistoryPage,
    disbursementView,
    loansPage,
    sanctionHistoryFilter,
    sanctionHistoryPage,
    sanctionView,
    searchByScope,
    user,
    visibleModules,
  ]);

  const runAction = async (id: string, action: () => Promise<void>, successMessage: string): Promise<boolean> => {
    setBusyId(id);
    setError(null);
    setSuccess(null);
    try {
      await action();
      setSuccess(successMessage);
      toast.success(successMessage);
      await refreshCurrentView();
      return true;
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'Unable to complete the action.';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setBusyId(null);
    }
  };

  const approve = (loanId: string) =>
    runAction(
      loanId,
      async () => {
        await apiFetch(`/ops/loans/${loanId}/sanction`, {
          method: 'PATCH',
          body: JSON.stringify({ decision: 'approve' }),
          headers: { 'Content-Type': 'application/json' },
        });
      },
      'Loan approved.',
    );

  const reject = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!rejectId || !rejectReason.trim()) return;
    const currentRejectId = rejectId;
    const succeeded = await runAction(
      currentRejectId,
      async () => {
        await apiFetch(`/ops/loans/${currentRejectId}/sanction`, {
          method: 'PATCH',
          body: JSON.stringify({ decision: 'reject', reason: rejectReason }),
          headers: { 'Content-Type': 'application/json' },
        });
      },
      'Loan rejected.',
    );
    if (!succeeded) return;
    setRejectId(null);
    setRejectReason('');
  };

  const sendForSanctionReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewId || !reviewReason.trim()) return;
    const currentReviewId = reviewId;
    const succeeded = await runAction(
      currentReviewId,
      async () => {
        const route = disbursementReviewMode === 'REJECT' ? 'disbursement-reject' : 'sanction-review';
        await apiFetch(`/ops/loans/${currentReviewId}/${route}`, {
          method: 'PATCH',
          body: JSON.stringify({ reason: reviewReason }),
          headers: { 'Content-Type': 'application/json' },
        });
      },
      disbursementReviewMode === 'REJECT' ? 'Loan rejected. Borrower can apply again.' : 'Loan sent back for sanction review.',
    );
    if (!succeeded) return;
    setReviewId(null);
    setReviewReason('');
    setDisbursementReviewMode('SANCTION_REVIEW');
  };

  const disburse = (loanId: string) =>
    runAction(
      loanId,
      async () => {
        await apiFetch(`/ops/loans/${loanId}/disburse`, { method: 'PATCH' });
      },
      'Loan marked as disbursed.',
    );

  const previewSalarySlip = async (loan: Loan) => {
    setPreviewLoadingId(loan.id);
    try {
      const blob = await apiFetchBlob(`/ops/loans/${loan.id}/salary-slip`);
      const mimeType = blob.type && blob.type !== 'application/octet-stream' ? blob.type : (loan.salarySlip?.mimeType ?? '');
      setSalarySlipPreview({
        url: URL.createObjectURL(blob),
        mimeType,
        originalName: loan.salarySlip?.originalName ?? 'Submitted salary slip',
      });
      toast.success('Salary slip preview loaded.');
    } catch (requestError) {
      const message = requestError instanceof ApiError ? requestError.message : 'Salary slip preview is unavailable.';
      setError(message);
      toast.error(message);
    } finally {
      setPreviewLoadingId(null);
    }
  };

  const requestDeleteBorrower = (borrowerId: string, borrowerName: string) =>
    setDeleteTarget({
      kind: 'borrower',
      id: borrowerId,
      subject: borrowerName,
      description: 'This removes the borrower account from CreditSea.',
      restriction: 'Only borrowers without any loan history can be deleted.',
    });

  const requestDeleteLoanApplication = (loanId: string, borrowerName: string) =>
    setDeleteTarget({
      kind: 'loan',
      id: loanId,
      subject: borrowerName,
      description: 'This removes the selected non-financial loan application.',
      restriction: 'Only APPLIED, SANCTION_REVIEW, or REJECTED applications with no payment history can be deleted.',
    });

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    await runAction(
      target.id,
      async () => {
        const route = target.kind === 'borrower' ? `/ops/borrowers/${target.id}` : `/ops/loans/${target.id}`;
        await apiFetch(route, { method: 'DELETE' });
      },
      target.kind === 'borrower' ? 'Borrower account deleted.' : 'Loan application deleted.',
    );
  };

  const recordPayment = async (event: FormEvent<HTMLFormElement>, loan: Loan) => {
    event.preventDefault();
    const fields = paymentFields[loan.id];
    if (!fields) return;
    const normalizedUtr = fields.utr.trim().toUpperCase();
    if (!UTR_REGEX.test(normalizedUtr)) {
      const message = 'UTR must be 6\u201330 characters using letters, digits, and optional hyphens.';
      setError(message);
      toast.error(message);
      return;
    }
    const amount = Number(fields.amount);
    const amountInPaise = Math.round(amount * 100);
    const outstandingInPaise = Math.round(loan.outstandingBalance * 100);
    if (!Number.isFinite(amount) || amount <= 0) {
      const message = 'Payment amount must be greater than zero.';
      setError(message);
      toast.error(message);
      return;
    }
    if (amountInPaise > outstandingInPaise) {
      const message = `Payment amount cannot be greater than the outstanding balance of ${formatCurrency(loan.outstandingBalance)}.`;
      setError(message);
      toast.error(message);
      return;
    }
    const isFinalPayment = amountInPaise === outstandingInPaise;
    const succeeded = await runAction(
      loan.id,
      async () => {
        await apiFetch(`/ops/loans/${loan.id}/payments`, {
          method: 'POST',
          body: JSON.stringify({ utr: normalizedUtr, amount, paymentDate: dateInputToEpoch(fields.paymentDate) }),
          headers: { 'Content-Type': 'application/json' },
        });
      },
      isFinalPayment ? 'Payment recorded. Loan is now closed.' : 'Payment recorded.',
    );
    if (!succeeded) return;
    setPaymentFields((current) => ({ ...current, [loan.id]: { utr: '', amount: '', paymentDate: new Date().toISOString().slice(0, 10) } }));
  };

  const setPaymentField = (loanId: string, field: 'utr' | 'amount' | 'paymentDate', value: string) =>
    setPaymentFields((current) => {
      const existing = current[loanId] ?? { utr: '', amount: '', paymentDate: new Date().toISOString().slice(0, 10) };
      return { ...current, [loanId]: { ...existing, [field]: value } };
    });
  const meta = moduleMeta[activeModule];

  if (!loading && user?.role === 'BORROWER') {
    return (
      <AppShell>
        <UnauthorizedState
          title="Operations access is required"
          description="This dashboard is reserved for lending operations roles. Use the borrower portal to manage your application and current loan."
          actionHref="/borrower/apply"
          actionLabel="Open borrower portal"
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <SectionHeading eyebrow={meta.eyebrow} title={`${meta.label} module`} description={meta.description} />
      {visibleModules.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {visibleModules.map((module) => (
            <button
              key={module}
              type="button"
              disabled={busyId !== null}
              aria-pressed={module === activeModule}
              aria-busy={module === activeModule && pageLoading}
              onClick={() => {
                setActiveModule(module);
                setLoansPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${module === activeModule ? 'bg-ink text-white' : 'border border-slate-200 bg-white text-slate-500 hover:text-ink'}`}
            >
              {moduleMeta[module].label}
            </button>
          ))}
        </div>
      )}
      {activeModule === 'sanction' && (
        <div className="mb-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => setSanctionView('pending')}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${sanctionView === 'pending' ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}
          >
            Pending review
          </button>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => setSanctionView('history')}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${sanctionView === 'history' ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}
          >
            Decision history
          </button>
        </div>
      )}
      {activeModule === 'disbursement' && (
        <div className="mb-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => setDisbursementView('pending')}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${disbursementView === 'pending' ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}
          >
            Pending disbursement
          </button>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => setDisbursementView('history')}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${disbursementView === 'history' ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}
          >
            Disbursement history
          </button>
        </div>
      )}
      {activeModule === 'collection' && (
        <div className="mb-6 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => setCollectionView('pending')}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${collectionView === 'pending' ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}
          >
            Pending repayments
          </button>
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => setCollectionView('history')}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-50 ${collectionView === 'history' ? 'bg-ink text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}
          >
            Payment history
          </button>
        </div>
      )}
      <SearchField
        config={searchFieldConfig[searchScope]}
        value={activeSearchInput}
        onChange={(value) => setSearchInputByScope((current) => ({ ...current, [searchScope]: value }))}
      />
      <div className="space-y-4">
        <ErrorMessage message={error} />
        {success && (
          <div className="animate-in fade-in slide-in-from-top-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 duration-300">
            {success}
          </div>
        )}
      </div>
      <div className="relative" aria-busy={pageLoading}>
        {pageLoading && (
          <div className="absolute inset-0 z-10 rounded-2xl bg-white/65 backdrop-blur-[1px]">
            <CreditSeaLoader label="Loading module\u2026" variant="compact" className="border-0 bg-transparent shadow-none" />
          </div>
        )}
        <div className="animate-in fade-in duration-300">
          {activeModule === 'sales' ? (
            <SalesPanel
              leads={leads}
              pagination={leadsPagination}
              disabled={pageLoading || busyId !== null}
              canDelete={user?.role === 'ADMIN'}
              onDelete={requestDeleteBorrower}
              onPageChange={(page) => void loadModule('sales', page)}
            />
          ) : activeModule === 'sanction' ? (
            sanctionView === 'pending' ? (
              <SanctionPanel
                loans={loans}
                pagination={loansPagination}
                disabled={pageLoading || busyId !== null}
                canDelete={user?.role === 'ADMIN'}
                onDelete={requestDeleteLoanApplication}
                onPageChange={setLoansPage}
                busyId={busyId}
                onApprove={approve}
                rejectId={rejectId}
                rejectReason={rejectReason}
                setRejectId={setRejectId}
                setRejectReason={setRejectReason}
                onReject={reject}
                onPreviewSalarySlip={previewSalarySlip}
                previewLoadingId={previewLoadingId}
              />
            ) : (
              <SanctionHistoryPanel
                loans={sanctionHistory}
                pagination={sanctionHistoryPagination}
                disabled={pageLoading || busyId !== null}
                canDelete={user?.role === 'ADMIN'}
                onDelete={requestDeleteLoanApplication}
                busyId={busyId}
                filter={sanctionHistoryFilter}
                onFilterChange={(filter) => {
                  setSanctionHistoryFilter(filter);
                  setSanctionHistoryPage(1);
                }}
                onPageChange={setSanctionHistoryPage}
                onPreviewSalarySlip={previewSalarySlip}
                previewLoadingId={previewLoadingId}
              />
            )
          ) : activeModule === 'disbursement' ? (
            disbursementView === 'pending' ? (
              <DisbursementPanel
                loans={loans}
                pagination={loansPagination}
                disabled={pageLoading || busyId !== null}
                onPageChange={setLoansPage}
                busyId={busyId}
                onDisburse={disburse}
                onPreviewSalarySlip={previewSalarySlip}
                previewLoadingId={previewLoadingId}
                reviewId={reviewId}
                reviewReason={reviewReason}
                setReviewId={setReviewId}
                setReviewReason={setReviewReason}
                disbursementReviewMode={disbursementReviewMode}
                setDisbursementReviewMode={setDisbursementReviewMode}
                onSendForSanctionReview={sendForSanctionReview}
              />
            ) : (
              <DisbursementHistoryPanel
                loans={disbursementHistory}
                pagination={disbursementHistoryPagination}
                disabled={pageLoading || busyId !== null}
                filter={disbursementHistoryFilter}
                onFilterChange={(filter) => {
                  setDisbursementHistoryFilter(filter);
                  setDisbursementHistoryPage(1);
                }}
                onPageChange={setDisbursementHistoryPage}
                onPreviewSalarySlip={previewSalarySlip}
                previewLoadingId={previewLoadingId}
              />
            )
          ) : collectionView === 'pending' ? (
            <CollectionPanel
              loans={loans}
              pagination={loansPagination}
              disabled={pageLoading || busyId !== null}
              onPageChange={setLoansPage}
              busyId={busyId}
              fields={paymentFields}
              onFieldChange={setPaymentField}
              onSubmit={recordPayment}
            />
          ) : (
            <CollectionHistoryPanel
              loans={collectionHistory}
              pagination={collectionHistoryPagination}
              disabled={pageLoading || busyId !== null}
              filter={collectionHistoryFilter}
              onFilterChange={(filter) => {
                setCollectionHistoryFilter(filter);
                setCollectionHistoryPage(1);
              }}
              onPageChange={setCollectionHistoryPage}
            />
          )}
        </div>
      </div>
      {user?.role === 'ADMIN' && <AdminControlsPanel />}
      <SalarySlipPreviewDialog preview={salarySlipPreview} onOpenChange={(open) => !open && setSalarySlipPreview(null)} />
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && busyId === null) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <AlertTriangle className="h-5 w-5" />
              Confirm deletion
            </DialogTitle>
            <DialogDescription>{deleteTarget?.description}</DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Selected record</p>
                <p className="mt-1 font-bold text-ink">{deleteTarget.subject}</p>
              </div>
              <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{deleteTarget.restriction} This action cannot be undone.</p>
              </div>
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="secondary-button" disabled={busyId !== null} onClick={() => setDeleteTarget(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-rose-500/20 transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busyId !== null}
                  onClick={() => void confirmDelete()}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete permanently
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
