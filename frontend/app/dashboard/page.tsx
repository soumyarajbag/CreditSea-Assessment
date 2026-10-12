'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Eye,
  FileText,
  LockKeyhole,
  Mail,
  Search,
  ShieldCheck,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react';

import { AppShell } from '@/components/app-shell';
import { UnauthorizedState } from '@/components/access-state';
import { useToast } from '@/components/toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CreditSeaLoader, EmptyState, ErrorMessage, InfoTooltip, SectionHeading, Spinner, StatusBadge } from '@/components/ui';
import { ApiError, apiFetch, apiFetchBlob } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { dateInputToEpoch, formatCurrency, formatDate } from '@/lib/format';
import { CollectionHistoryLoan, Lead, Loan, PaginationMeta, Role } from '@/lib/types';
import { UTR_FORMAT_HELP, UTR_REGEX } from '@/lib/validation';

type ModuleName = 'sales' | 'sanction' | 'disbursement' | 'collection';
type SanctionView = 'pending' | 'history';
type DisbursementView = 'pending' | 'history';
type CollectionView = 'pending' | 'history';
type SanctionHistoryFilter = 'ALL' | 'SANCTIONED' | 'REJECTED' | 'DISBURSED' | 'CLOSED';
type DisbursementHistoryFilter = 'ALL' | 'SANCTION_REVIEW' | 'REJECTED' | 'DISBURSED' | 'CLOSED';
type CollectionHistoryFilter = 'ALL' | 'DISBURSED' | 'CLOSED';
type SearchScope =
  | 'sales'
  | 'sanctionPending'
  | 'sanctionHistory'
  | 'disbursementPending'
  | 'disbursementHistory'
  | 'collectionPending'
  | 'collectionHistory';
type SearchFieldConfig = { label: string; placeholder: string; help: string };
type DeleteTarget = {
  kind: 'borrower' | 'loan';
  id: string;
  subject: string;
  description: string;
  restriction: string;
};
type LoadContext = { id: number; key: string };
type SalarySlipPreview = { url: string; mimeType: string; originalName: string };

const PAGE_SIZE = 10;

const listQuery = (page: number, status?: string, search?: string): string => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status && status !== 'ALL') params.set('status', status);
  if (search?.trim()) params.set('search', search.trim());
  return `?${params.toString()}`;
};

const moduleMeta: Record<ModuleName, { label: string; eyebrow: string; description: string }> = {
  sales: { label: 'Sales', eyebrow: 'Lead tracking', description: 'Registered borrowers who have not submitted a loan application.' },
  sanction: { label: 'Sanction', eyebrow: 'Credit review', description: 'Review applied loans and approve or reject them with a reason.' },
  disbursement: {
    label: 'Disbursement',
    eyebrow: 'Funds release',
    description: 'Mark approved loans as disbursed when funds are released.',
  },
  collection: { label: 'Collection', eyebrow: 'Repayment tracking', description: 'Record payments and monitor outstanding balances.' },
};

const searchFieldConfig: Record<SearchScope, SearchFieldConfig> = {
  sales: {
    label: 'Search borrowers',
    placeholder: 'Name, email, or PAN',
    help: 'Search open borrower leads by their name, email address, or PAN number.',
  },
  sanctionPending: {
    label: 'Search applications for review',
    placeholder: 'Borrower name, email, PAN, or loan ID',
    help: 'Search applied loan applications using borrower details or the full loan ID.',
  },
  sanctionHistory: {
    label: 'Search decision history',
    placeholder: 'Borrower name, email, PAN, or loan ID',
    help: 'Search sanctioned, rejected, disbursed, or closed applications by borrower or loan ID.',
  },
  disbursementPending: {
    label: 'Search approved loans',
    placeholder: 'Borrower name, email, PAN, or loan ID',
    help: 'Search approved loans that are ready for disbursement.',
  },
  disbursementHistory: {
    label: 'Search disbursement history',
    placeholder: 'Borrower name, email, PAN, or loan ID',
    help: 'Search sanction-review, rejected, disbursed, and closed loans by borrower details or loan ID.',
  },
  collectionPending: {
    label: 'Search repayment accounts',
    placeholder: 'Borrower name, email, PAN, loan ID, or UTR',
    help: 'Search active repayment accounts by borrower, loan ID, or payment UTR.',
  },
  collectionHistory: {
    label: 'Search payment history',
    placeholder: 'Borrower name, email, PAN, loan ID, or UTR',
    help: 'Search repayment history by borrower, loan ID, or payment UTR.',
  },
};

const getSearchScope = (
  module: ModuleName,
  sanctionView: SanctionView,
  disbursementView: DisbursementView,
  collectionView: CollectionView,
): SearchScope => {
  if (module === 'sales') return 'sales';
  if (module === 'sanction') return sanctionView === 'history' ? 'sanctionHistory' : 'sanctionPending';
  if (module === 'disbursement') return disbursementView === 'history' ? 'disbursementHistory' : 'disbursementPending';
  return collectionView === 'history' ? 'collectionHistory' : 'collectionPending';
};

const firstModuleForRole = (role: Role): ModuleName =>
  role === 'SALES' ? 'sales' : role === 'SANCTION' ? 'sanction' : role === 'DISBURSEMENT' ? 'disbursement' : 'collection';

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
      const message = 'UTR must be 6–30 characters using letters, digits, and optional hyphens.';
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
            <CreditSeaLoader label="Loading module…" variant="compact" className="border-0 bg-transparent shadow-none" />
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

function SalarySlipPreviewDialog({ preview, onOpenChange }: { preview: SalarySlipPreview | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={preview !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-4 sm:p-6">
        <DialogHeader className="px-2 pt-1">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" /> Salary slip preview
          </DialogTitle>
          <DialogDescription>
            {preview?.originalName ?? 'Submitted salary slip'} · Protected operations preview; the stored file URL is not exposed.
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

function SalarySlipPreviewFrame({ url, mimeType, className = '' }: { url: string; mimeType: string; className?: string }) {
  if (mimeType === 'application/pdf') {
    return <iframe title="Salary slip document" src={url} className={`w-full bg-white ${className}`} />;
  }
  return <img src={url} alt="Salary slip" className={`w-full object-contain ${className}`} />;
}

function SearchField({ config, value, onChange }: { config: SearchFieldConfig; value: string; onChange: (value: string) => void }) {
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

function AdminControlsPanel() {
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

function PaginationControls({
  pagination,
  disabled,
  onPageChange,
}: {
  pagination: PaginationMeta | null;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  if (!pagination || pagination.total === 0) return null;
  const firstItem = (pagination.page - 1) * pagination.pageSize + 1;
  const lastItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-slate-500">
        Showing{' '}
        <span className="font-bold text-ink">
          {firstItem}–{lastItem}
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

function SalesPanel({
  leads,
  pagination,
  disabled,
  canDelete,
  onDelete,
  onPageChange,
}: {
  leads: Lead[];
  pagination: PaginationMeta | null;
  disabled: boolean;
  canDelete: boolean;
  onDelete: (id: string, borrowerName: string) => void;
  onPageChange: (page: number) => void;
}) {
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
                        className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 -ml-2 text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
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

function LoanTable<T extends Loan>({ loans, children }: { loans: T[]; children?: (loan: T) => React.ReactNode }) {
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
                  •
                </span>{' '}
                {loan.borrower?.email ?? 'Email unavailable'}
              </p>
              <h2 className="mt-2 text-lg font-black text-ink">{formatCurrency(loan.amount)}</h2>
              <p className="mt-1 text-sm text-slate-500">
                Applied on {formatDate(loan.createdAt)}{' '}
                <span className="px-1 text-slate-300" aria-hidden="true">
                  •
                </span>{' '}
                {loan.tenureDays}-day term{' '}
                <span className="px-1 text-slate-300" aria-hidden="true">
                  •
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

function SanctionPanel({
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
}: {
  loans: Loan[];
  pagination: PaginationMeta | null;
  disabled: boolean;
  canDelete: boolean;
  onDelete: (id: string, borrowerName: string) => void;
  onPageChange: (page: number) => void;
  busyId: string | null;
  onApprove: (id: string) => void;
  rejectId: string | null;
  rejectReason: string;
  setRejectId: (id: string | null) => void;
  setRejectReason: (reason: string) => void;
  onReject: (event: FormEvent<HTMLFormElement>) => void;
  onPreviewSalarySlip: (loan: Loan) => void;
  previewLoadingId: string | null;
}) {
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
                    {busyId !== null ? 'Saving…' : 'Confirm rejection'}
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
                    {previewLoadingId === loan.id ? 'Loading slip…' : 'View salary slip'}
                  </button>
                  <button className="primary-button" disabled={busyId !== null} onClick={() => onApprove(loan.id)}>
                    {busyId !== null && <Spinner className="h-3.5 w-3.5" />}
                    {busyId !== null ? 'Saving…' : 'Approve loan'}
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

function SanctionHistoryPanel({
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
}: {
  loans: Loan[];
  pagination: PaginationMeta | null;
  disabled: boolean;
  canDelete: boolean;
  onDelete: (id: string, borrowerName: string) => void;
  busyId: string | null;
  filter: SanctionHistoryFilter;
  onFilterChange: (filter: SanctionHistoryFilter) => void;
  onPageChange: (page: number) => void;
  onPreviewSalarySlip: (loan: Loan) => void;
  previewLoadingId: string | null;
}) {
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
                {previewLoadingId === loan.id ? 'Loading slip…' : 'View salary slip'}
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

function DisbursementPanel({
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
}: {
  loans: Loan[];
  pagination: PaginationMeta | null;
  disabled: boolean;
  onPageChange: (page: number) => void;
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
}) {
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
                    {busyId !== null ? 'Saving…' : disbursementReviewMode === 'REJECT' ? 'Confirm rejection' : 'Send for sanction review'}
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
                  {previewLoadingId === loan.id ? 'Loading slip…' : 'View salary slip'}
                </button>
                <button className="primary-button" disabled={busyId !== null} onClick={() => onDisburse(loan.id)}>
                  {busyId !== null && <Spinner className="h-3.5 w-3.5" />}
                  {busyId !== null ? 'Saving…' : 'Mark as disbursed'}
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

function DisbursementHistoryPanel({
  loans,
  pagination,
  disabled,
  filter,
  onFilterChange,
  onPageChange,
  onPreviewSalarySlip,
  previewLoadingId,
}: {
  loans: Loan[];
  pagination: PaginationMeta | null;
  disabled: boolean;
  filter: DisbursementHistoryFilter;
  onFilterChange: (filter: DisbursementHistoryFilter) => void;
  onPageChange: (page: number) => void;
  onPreviewSalarySlip: (loan: Loan) => void;
  previewLoadingId: string | null;
}) {
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
              {previewLoadingId === loan.id ? 'Loading slip…' : 'View salary slip'}
            </button>
          </div>
        )}
      </LoanTable>
      <PaginationControls pagination={pagination} disabled={disabled} onPageChange={onPageChange} />
    </div>
  );
}

function CollectionHistoryPanel({
  loans,
  pagination,
  disabled,
  filter,
  onFilterChange,
  onPageChange,
}: {
  loans: CollectionHistoryLoan[];
  pagination: PaginationMeta | null;
  disabled: boolean;
  filter: CollectionHistoryFilter;
  onFilterChange: (filter: CollectionHistoryFilter) => void;
  onPageChange: (page: number) => void;
}) {
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

function CollectionPanel({
  loans,
  pagination,
  disabled,
  onPageChange,
  busyId,
  fields,
  onFieldChange,
  onSubmit,
}: {
  loans: Loan[];
  pagination: PaginationMeta | null;
  disabled: boolean;
  onPageChange: (page: number) => void;
  busyId: string | null;
  fields: Record<string, { utr: string; amount: string; paymentDate: string }>;
  onFieldChange: (loanId: string, field: 'utr' | 'amount' | 'paymentDate', value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, loan: Loan) => void;
}) {
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
                  {busyId !== null ? 'Saving…' : hasPreviousPayment ? 'Record another payment' : 'Record payment'}
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
