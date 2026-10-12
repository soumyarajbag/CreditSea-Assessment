import type { Role } from '@/lib/types';

import type { CollectionView, DisbursementView, ModuleName, SanctionView, SearchFieldConfig, SearchScope } from './dashboard-types';

export const PAGE_SIZE = 10;

export const listQuery = (page: number, status?: string, search?: string): string => {
  const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
  if (status && status !== 'ALL') params.set('status', status);
  if (search?.trim()) params.set('search', search.trim());
  return `?${params.toString()}`;
};

export const moduleMeta: Record<ModuleName, { label: string; eyebrow: string; description: string }> = {
  sales: { label: 'Sales', eyebrow: 'Lead tracking', description: 'Registered borrowers who have not submitted a loan application.' },
  sanction: { label: 'Sanction', eyebrow: 'Credit review', description: 'Review applied loans and approve or reject them with a reason.' },
  disbursement: {
    label: 'Disbursement',
    eyebrow: 'Funds release',
    description: 'Mark approved loans as disbursed when funds are released.',
  },
  collection: { label: 'Collection', eyebrow: 'Repayment tracking', description: 'Record payments and monitor outstanding balances.' },
};

export const searchFieldConfig: Record<SearchScope, SearchFieldConfig> = {
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

export const getSearchScope = (
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

export const firstModuleForRole = (role: Role): ModuleName =>
  role === 'SALES' ? 'sales' : role === 'SANCTION' ? 'sanction' : role === 'DISBURSEMENT' ? 'disbursement' : 'collection';
