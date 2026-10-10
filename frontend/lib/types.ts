export type Role = 'ADMIN' | 'SALES' | 'SANCTION' | 'DISBURSEMENT' | 'COLLECTION' | 'BORROWER';

export type EmploymentMode = 'SALARIED' | 'SELF_EMPLOYED' | 'UNEMPLOYED';
export type LoanStatus = 'APPLIED' | 'SANCTIONED' | 'REJECTED' | 'DISBURSED' | 'CLOSED';
export type EpochTimestamp = number;

export interface User {
  id: string;
  email: string;
  role: Role;
  fullName: string | null;
  pan: string | null;
  dateOfBirth: EpochTimestamp | null;
  monthlySalary: number | null;
  employmentMode: EmploymentMode | null;
  profileCompleted: boolean;
}

export interface EligibilityResult {
  eligible: boolean;
  errors: string[];
}

export interface SalarySlip {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface Loan {
  id: string;
  borrowerId: string | null;
  borrower?: {
    id: string;
    email: string | null;
    fullName: string | null;
    pan: string | null;
  } | null;
  amount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  totalPaid: number;
  outstandingBalance: number;
  status: LoanStatus;
  rejectionReason: string | null;
  salarySlip: SalarySlip | null;
  sanctionedAt: EpochTimestamp | null;
  disbursedAt: EpochTimestamp | null;
  closedAt: EpochTimestamp | null;
  createdAt: EpochTimestamp;
  updatedAt: EpochTimestamp;
}

export interface CollectionHistoryPayment {
  id: string;
  utr: string;
  amount: number;
  paymentDate: EpochTimestamp;
  createdAt: EpochTimestamp;
}

export interface CollectionHistoryLoan extends Loan {
  payments: CollectionHistoryPayment[];
}

export interface Lead {
  id: string;
  email: string;
  fullName: string | null;
  profileCompleted: boolean;
  createdAt: EpochTimestamp;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
