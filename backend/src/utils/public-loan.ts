import { LoanStatus } from '../constants';
import { LoanDocument } from '../types';
import { roundMoney } from './round-money';

export const toPublicLoan = (loan: Partial<LoanDocument> & { _id: unknown; borrowerId?: unknown }) => ({
  id: String(loan._id),
  borrowerId:
    loan.borrowerId && typeof loan.borrowerId === 'object' && '_id' in loan.borrowerId
      ? String((loan.borrowerId as { _id: unknown })._id)
      : loan.borrowerId
        ? String(loan.borrowerId)
        : null,
  borrower:
    loan.borrowerId && typeof loan.borrowerId === 'object' && 'email' in loan.borrowerId
      ? {
          id: String((loan.borrowerId as { _id: unknown })._id),
          email: (loan.borrowerId as { email?: string }).email ?? null,
          fullName: (loan.borrowerId as { fullName?: string }).fullName ?? null,
          pan: (loan.borrowerId as { pan?: string }).pan ?? null,
        }
      : null,
  amount: loan.amount,
  tenureDays: loan.tenureDays,
  interestRate: loan.interestRate,
  simpleInterest: loan.simpleInterest,
  totalRepayment: loan.totalRepayment,
  totalPaid: loan.totalPaid ?? 0,
  outstandingBalance: roundMoney(Math.max((loan.totalRepayment ?? 0) - (loan.totalPaid ?? 0), 0)),
  status: loan.status,
  rejectionReason: loan.rejectionReason ?? null,
  reviewComment: loan.reviewComment ?? null,
  salarySlip: loan.salarySlip
    ? {
        originalName: loan.salarySlip.originalName,
        mimeType: loan.salarySlip.mimeType,
        sizeBytes: loan.salarySlip.sizeBytes,
      }
    : null,
  sanctionedAt: loan.sanctionedAt ?? null,
  disbursedAt: loan.disbursedAt ?? null,
  closedAt: loan.closedAt ?? null,
  createdAt: loan.createdAt,
  updatedAt: loan.updatedAt,
  isClosed: loan.status === LoanStatus.CLOSED,
});
