import { LoanStatus } from './types';

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value);

export const formatDate = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '—';
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
};

export const epochToDateInput = (value: number | null | undefined): string =>
  value === null || value === undefined ? '' : new Date(value).toISOString().slice(0, 10);

export const dateInputToEpoch = (value: string): number => Date.parse(`${value}T00:00:00.000Z`);

export const formatLoanStatus = (status: LoanStatus): string => status.charAt(0) + status.slice(1).toLowerCase();

export const simpleInterest = (amount: number, tenureDays: number): number =>
  Math.round(((amount * 12 * tenureDays) / (365 * 100) + Number.EPSILON) * 100) / 100;

export const totalRepayment = (amount: number, tenureDays: number): number =>
  Math.round((amount + simpleInterest(amount, tenureDays) + Number.EPSILON) * 100) / 100;
