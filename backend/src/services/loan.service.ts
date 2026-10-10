import { FilterQuery, PipelineStage, Types } from 'mongoose';

import { INTEREST_RATE, LoanStatus, Role } from '../constants';
import { LoanModel } from '../models/loan.model';
import { PaymentModel } from '../models/payment.model';
import { UserModel } from '../models/user.model';
import { LoanDocument, SalarySlipMetadata } from '../types';
import { AppError } from '../utils/app-error';
import { toPublicLoan } from '../utils/public-loan';
import { createPaginationMeta, PaginationInput } from '../utils/pagination';
import { roundMoney } from '../utils/round-money';
import { nowEpoch, toEpoch } from '../utils/epoch';
import { evaluateEligibility } from './eligibility.service';
import { fetchStoredFile, removeStoredFile, storeSalarySlip } from './file.service';

export const calculateLoan = (amount: number, tenureDays: number) => {
  const simpleInterest = roundMoney((amount * INTEREST_RATE * tenureDays) / (365 * 100));
  return { simpleInterest, totalRepayment: roundMoney(amount + simpleInterest) };
};

const activeLoanStatuses = [LoanStatus.APPLIED, LoanStatus.SANCTIONED, LoanStatus.DISBURSED];

export const updateBorrowerProfile = async (userId: string, profile: Record<string, unknown>) => {
  const user = await UserModel.findOneAndUpdate(
    { _id: userId, role: Role.BORROWER },
    {
      $set: {
        fullName: profile.fullName,
        pan: String(profile.pan).toUpperCase(),
        dateOfBirth: toEpoch(profile.dateOfBirth),
        monthlySalary: Number(profile.monthlySalary),
        employmentMode: profile.employmentMode,
        profileCompleted: true,
      },
    },
    { new: true, runValidators: true },
  );

  if (!user) throw new AppError(404, 'Borrower profile not found.', 'BORROWER_NOT_FOUND');
  const eligibility = evaluateEligibility(user);
  return { profile: user, eligibility };
};

export const getBorrowerProfile = async (userId: string) => {
  const user = await UserModel.findOne({ _id: userId, role: Role.BORROWER });
  if (!user) throw new AppError(404, 'Borrower profile not found.', 'BORROWER_NOT_FOUND');
  return { profile: user, eligibility: evaluateEligibility(user) };
};

export const createLoanApplication = async (borrowerId: string, amount: number, tenureDays: number, file: Express.Multer.File) => {
  const borrower = await UserModel.findOne({ _id: borrowerId, role: Role.BORROWER });
  if (!borrower) throw new AppError(404, 'Borrower account not found.', 'BORROWER_NOT_FOUND');

  const eligibility = evaluateEligibility(borrower);
  if (!eligibility.eligible) {
    throw new AppError(422, 'Borrower is not eligible to apply.', 'BRE_FAILED', eligibility.errors);
  }

  const existingLoan = await LoanModel.exists({ borrowerId, status: { $in: activeLoanStatuses } });
  if (existingLoan) {
    throw new AppError(409, 'You already have an active loan application.', 'ACTIVE_LOAN_EXISTS');
  }

  const calculation = calculateLoan(amount, tenureDays);
  let salarySlip: SalarySlipMetadata | undefined;
  try {
    salarySlip = await storeSalarySlip(file, borrowerId);
    const loan = await LoanModel.create({
      borrowerId,
      amount,
      tenureDays,
      interestRate: INTEREST_RATE,
      simpleInterest: calculation.simpleInterest,
      totalRepayment: calculation.totalRepayment,
      totalPaid: 0,
      status: LoanStatus.APPLIED,
      salarySlip,
    });
    return toPublicLoan(loan);
  } catch (error) {
    if (salarySlip) await removeStoredFile(salarySlip.deleteUrl);
    throw error;
  }
};

export const getBorrowerLoan = async (borrowerId: string) => {
  const loan = await LoanModel.findOne({ borrowerId }).sort({ createdAt: -1 }).lean();
  if (!loan) throw new AppError(404, 'No loan application found.', 'LOAN_NOT_FOUND');
  return toPublicLoan(loan);
};

export const getBorrowerSalarySlip = async (borrowerId: string) => {
  const loan = await LoanModel.findOne({ borrowerId }).sort({ createdAt: -1 }).lean();
  if (!loan) throw new AppError(404, 'No loan application found.', 'LOAN_NOT_FOUND');

  try {
    if (!loan.salarySlip.url) throw new Error('Hosted salary slip URL is missing.');
    const content = await fetchStoredFile(loan.salarySlip.url);
    return { content, mimeType: loan.salarySlip.mimeType };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(404, 'Salary slip preview is unavailable.', 'SALARY_SLIP_NOT_FOUND');
  }
};

const populateBorrower = (query: ReturnType<typeof LoanModel.find>) =>
  query.populate('borrowerId', 'email fullName pan dateOfBirth monthlySalary employmentMode');

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getSearchRegex = (search: string): RegExp => new RegExp(escapeRegex(search.trim()), 'i');

const addLoanSearchFilter = async (
  baseFilter: FilterQuery<LoanDocument>,
  search: string,
  includePaymentUtr = false,
): Promise<FilterQuery<LoanDocument>> => {
  const normalizedSearch = search.trim();
  if (!normalizedSearch) return baseFilter;

  const searchRegex = getSearchRegex(normalizedSearch);
  const borrowerIds = await UserModel.find({
    role: Role.BORROWER,
    $or: [{ fullName: searchRegex }, { email: searchRegex }, { pan: searchRegex }],
  }).distinct('_id');

  const matchingLoans: FilterQuery<LoanDocument>[] = [{ borrowerId: { $in: borrowerIds } }];
  if (Types.ObjectId.isValid(normalizedSearch)) matchingLoans.push({ _id: normalizedSearch });

  if (includePaymentUtr) {
    const paymentLoanIds = await PaymentModel.find({ utr: searchRegex }).distinct('loanId');
    if (paymentLoanIds.length > 0) matchingLoans.push({ _id: { $in: paymentLoanIds } });
  }

  return { $and: [baseFilter, { $or: matchingLoans }] };
};

export const getSanctionLoans = async ({ page, pageSize, search }: PaginationInput) => {
  const filter = await addLoanSearchFilter({ status: LoanStatus.APPLIED }, search);
  const [loans, total] = await Promise.all([
    populateBorrower(
      LoanModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
    ).lean(),
    LoanModel.countDocuments(filter),
  ]);
  return { loans: loans.map((loan) => toPublicLoan(loan)), pagination: createPaginationMeta(page, pageSize, total) };
};

export const getSanctionHistory = async ({ page, pageSize, search }: PaginationInput, status?: LoanStatus) => {
  const historicalStatuses = [LoanStatus.SANCTIONED, LoanStatus.REJECTED, LoanStatus.DISBURSED, LoanStatus.CLOSED];
  const filter = await addLoanSearchFilter(status ? { status } : { status: { $in: historicalStatuses } }, search);
  const [loans, total] = await Promise.all([
    populateBorrower(
      LoanModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
    ).lean(),
    LoanModel.countDocuments(filter),
  ]);
  return { loans: loans.map((loan) => toPublicLoan(loan)), pagination: createPaginationMeta(page, pageSize, total) };
};

export const getDisbursementLoans = async ({ page, pageSize, search }: PaginationInput) => {
  const filter = await addLoanSearchFilter({ status: LoanStatus.SANCTIONED }, search);
  const [loans, total] = await Promise.all([
    populateBorrower(
      LoanModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
    ).lean(),
    LoanModel.countDocuments(filter),
  ]);
  return { loans: loans.map((loan) => toPublicLoan(loan)), pagination: createPaginationMeta(page, pageSize, total) };
};

export const getDisbursementHistory = async ({ page, pageSize, search }: PaginationInput, status?: LoanStatus) => {
  const historicalStatuses = [LoanStatus.DISBURSED, LoanStatus.CLOSED];
  const filter = await addLoanSearchFilter(status ? { status } : { status: { $in: historicalStatuses } }, search);
  const [loans, total] = await Promise.all([
    populateBorrower(
      LoanModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
    ).lean(),
    LoanModel.countDocuments(filter),
  ]);
  return { loans: loans.map((loan) => toPublicLoan(loan)), pagination: createPaginationMeta(page, pageSize, total) };
};

export const getCollectionLoans = async ({ page, pageSize, search }: PaginationInput) => {
  const filter = await addLoanSearchFilter({ status: LoanStatus.DISBURSED }, search, true);
  const [loans, total] = await Promise.all([
    populateBorrower(
      LoanModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
    ).lean(),
    LoanModel.countDocuments(filter),
  ]);
  return { loans: loans.map((loan) => toPublicLoan(loan)), pagination: createPaginationMeta(page, pageSize, total) };
};

export const getCollectionHistory = async ({ page, pageSize, search }: PaginationInput, status?: LoanStatus) => {
  const historicalStatuses = [LoanStatus.DISBURSED, LoanStatus.CLOSED];
  const baseFilter = status ? { status, totalPaid: { $gt: 0 } } : { status: { $in: historicalStatuses }, totalPaid: { $gt: 0 } };
  const filter = await addLoanSearchFilter(baseFilter, search, true);
  const [loans, total] = await Promise.all([
    populateBorrower(
      LoanModel.find(filter)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
    ).lean(),
    LoanModel.countDocuments(filter),
  ]);
  const loanIds = loans.map((loan) => loan._id);
  const payments = await PaymentModel.find({ loanId: { $in: loanIds } })
    .sort({ paymentDate: -1 })
    .lean();
  const paymentsByLoan = new Map<string, Array<{ id: string; utr: string; amount: number; paymentDate: number; createdAt: number }>>();

  for (const payment of payments) {
    const loanId = String(payment.loanId);
    const loanPayments = paymentsByLoan.get(loanId) ?? [];
    loanPayments.push({
      id: String(payment._id),
      utr: payment.utr,
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      createdAt: payment.createdAt,
    });
    paymentsByLoan.set(loanId, loanPayments);
  }

  return {
    loans: loans.map((loan) => ({
      ...toPublicLoan(loan),
      payments: paymentsByLoan.get(String(loan._id)) ?? [],
    })),
    pagination: createPaginationMeta(page, pageSize, total),
  };
};

export const getSalesLeads = async ({ page, pageSize, search }: PaginationInput) => {
  const normalizedSearch = search.trim();
  const searchMatch = normalizedSearch
    ? {
        $or: [
          { fullName: getSearchRegex(normalizedSearch) },
          { email: getSearchRegex(normalizedSearch) },
          { pan: getSearchRegex(normalizedSearch) },
        ],
      }
    : {};
  const leadPipeline: PipelineStage[] = [
    { $match: { role: Role.BORROWER, ...searchMatch } },
    { $lookup: { from: LoanModel.collection.name, localField: '_id', foreignField: 'borrowerId', as: 'loanApplications' } },
    { $match: { $expr: { $eq: [{ $size: '$loanApplications' }, 0] } } },
    { $sort: { createdAt: -1 } },
  ];
  const [countResult, pagedLeads] = await Promise.all([
    UserModel.aggregate([...leadPipeline, { $count: 'total' }]),
    UserModel.aggregate([
      ...leadPipeline,
      { $skip: (page - 1) * pageSize },
      { $limit: pageSize },
      { $project: { email: 1, fullName: 1, profileCompleted: 1, createdAt: 1 } },
    ]),
  ]);
  const total = countResult[0]?.total ?? 0;
  return {
    leads: pagedLeads.map((borrower) => ({
      id: String(borrower._id),
      email: borrower.email,
      fullName: borrower.fullName ?? null,
      profileCompleted: borrower.profileCompleted,
      createdAt: borrower.createdAt,
    })),
    pagination: createPaginationMeta(page, pageSize, total),
  };
};

export const sanctionLoan = async (loanId: string, userId: string, decision: 'approve' | 'reject', reason?: string) => {
  if (!Types.ObjectId.isValid(loanId)) throw new AppError(404, 'Loan not found.', 'LOAN_NOT_FOUND');
  const update =
    decision === 'approve'
      ? { status: LoanStatus.SANCTIONED, sanctionedBy: userId, sanctionedAt: nowEpoch(), rejectionReason: undefined }
      : { status: LoanStatus.REJECTED, rejectionReason: reason, sanctionedBy: userId, sanctionedAt: nowEpoch() };
  const loan = await LoanModel.findOneAndUpdate({ _id: loanId, status: LoanStatus.APPLIED }, update, { new: true }).lean();
  if (!loan) throw new AppError(409, 'Only applied loans can be sanctioned.', 'INVALID_LOAN_TRANSITION');
  return toPublicLoan(loan);
};

export const disburseLoan = async (loanId: string, userId: string) => {
  if (!Types.ObjectId.isValid(loanId)) throw new AppError(404, 'Loan not found.', 'LOAN_NOT_FOUND');
  const loan = await LoanModel.findOneAndUpdate(
    { _id: loanId, status: LoanStatus.SANCTIONED },
    { status: LoanStatus.DISBURSED, disbursedBy: userId, disbursedAt: nowEpoch() },
    { new: true },
  ).lean();
  if (!loan) throw new AppError(409, 'Only sanctioned loans can be disbursed.', 'INVALID_LOAN_TRANSITION');
  return toPublicLoan(loan);
};

const getDisbursedLoan = async (loanId: string) => {
  if (!Types.ObjectId.isValid(loanId)) throw new AppError(404, 'Loan not found.', 'LOAN_NOT_FOUND');
  const loan = await LoanModel.findOne({ _id: loanId, status: LoanStatus.DISBURSED });
  if (!loan) throw new AppError(409, 'Only disbursed loans accept payments.', 'INVALID_LOAN_TRANSITION');
  return loan;
};

export const recordPayment = async (
  loanId: string,
  recordedBy: string,
  payment: { utr: string; amount: number; paymentDate: number | string },
) => {
  const loan = await getDisbursedLoan(loanId);
  const alreadyUsed = await PaymentModel.exists({ utr: payment.utr });
  if (alreadyUsed) throw new AppError(409, 'UTR number must be unique across all payments.', 'DUPLICATE_UTR');

  const outstanding = roundMoney(loan.totalRepayment - loan.totalPaid);
  if (payment.amount > outstanding) {
    throw new AppError(422, `Payment cannot exceed the outstanding balance of ₹${outstanding.toFixed(2)}.`, 'OVERPAYMENT');
  }

  const nextTotalPaid = roundMoney(loan.totalPaid + payment.amount);
  const isClosed = nextTotalPaid === loan.totalRepayment;
  const updatedLoan = await LoanModel.findOneAndUpdate(
    { _id: loan._id, status: LoanStatus.DISBURSED, totalPaid: loan.totalPaid },
    {
      $set: {
        totalPaid: nextTotalPaid,
        status: isClosed ? LoanStatus.CLOSED : LoanStatus.DISBURSED,
        ...(isClosed ? { closedAt: nowEpoch() } : {}),
      },
    },
    { new: true },
  ).lean();

  if (!updatedLoan) throw new AppError(409, 'Loan changed while recording the payment. Please retry.', 'PAYMENT_CONFLICT');

  try {
    await PaymentModel.create({
      loanId: loan._id,
      borrowerId: loan.borrowerId,
      utr: payment.utr,
      amount: payment.amount,
      paymentDate: toEpoch(payment.paymentDate),
      recordedBy,
    });
  } catch (error) {
    await LoanModel.updateOne(
      { _id: loan._id, totalPaid: nextTotalPaid },
      { $set: { totalPaid: loan.totalPaid, status: LoanStatus.DISBURSED }, $unset: { closedAt: 1 } },
    );
    throw error;
  }

  return toPublicLoan(updatedLoan);
};

export const getOperationsLoan = async (loanId: string, role: Role) => {
  if (!Types.ObjectId.isValid(loanId)) throw new AppError(404, 'Loan not found.', 'LOAN_NOT_FOUND');
  const loan = await LoanModel.findById(loanId)
    .populate('borrowerId', 'email fullName pan dateOfBirth monthlySalary employmentMode')
    .lean();
  if (!loan) throw new AppError(404, 'Loan not found.', 'LOAN_NOT_FOUND');
  if (role !== Role.ADMIN) {
    const allowedStatuses: Record<string, LoanStatus[]> = {
      [Role.SANCTION]: [LoanStatus.APPLIED, LoanStatus.SANCTIONED, LoanStatus.REJECTED],
      [Role.DISBURSEMENT]: [LoanStatus.SANCTIONED, LoanStatus.DISBURSED],
      [Role.COLLECTION]: [LoanStatus.DISBURSED, LoanStatus.CLOSED],
    };
    if (!allowedStatuses[role]?.includes(loan.status)) {
      throw new AppError(403, 'This loan is outside your module.', 'FORBIDDEN');
    }
  }
  return toPublicLoan(loan);
};

const deletableLoanStatuses = [LoanStatus.APPLIED, LoanStatus.REJECTED];

export const deleteBorrowerWithoutLoanHistory = async (borrowerId: string) => {
  if (!Types.ObjectId.isValid(borrowerId)) throw new AppError(404, 'Borrower not found.', 'BORROWER_NOT_FOUND');

  const borrower = await UserModel.findOne({ _id: borrowerId, role: Role.BORROWER }).select('_id').lean();
  if (!borrower) throw new AppError(404, 'Borrower not found.', 'BORROWER_NOT_FOUND');

  const hasLoanHistory = await LoanModel.exists({ borrowerId });
  if (hasLoanHistory) {
    throw new AppError(409, 'Borrowers with loan history cannot be deleted.', 'BORROWER_HAS_LOAN_HISTORY');
  }

  const deletedBorrower = await UserModel.findOneAndDelete({ _id: borrowerId, role: Role.BORROWER }).lean();
  if (!deletedBorrower) throw new AppError(409, 'Borrower changed while being deleted. Please retry.', 'DELETE_CONFLICT');

  return { borrowerId: String(deletedBorrower._id) };
};

export const deleteNonFinancialLoanApplication = async (loanId: string) => {
  if (!Types.ObjectId.isValid(loanId)) throw new AppError(404, 'Loan not found.', 'LOAN_NOT_FOUND');

  const existingLoan = await LoanModel.findById(loanId).lean();
  if (!existingLoan) throw new AppError(404, 'Loan not found.', 'LOAN_NOT_FOUND');
  if (!deletableLoanStatuses.includes(existingLoan.status)) {
    throw new AppError(409, 'Only applied or rejected applications can be deleted.', 'LOAN_DELETE_NOT_ALLOWED');
  }

  const hasPayments = await PaymentModel.exists({ loanId: existingLoan._id });
  if (hasPayments || existingLoan.totalPaid > 0) {
    throw new AppError(409, 'Loans with payment history cannot be deleted.', 'LOAN_HAS_PAYMENT_HISTORY');
  }

  const deletedLoan = await LoanModel.findOneAndDelete({
    _id: existingLoan._id,
    status: { $in: deletableLoanStatuses },
    totalPaid: 0,
  }).lean();
  if (!deletedLoan) throw new AppError(409, 'Loan changed while being deleted. Please retry.', 'DELETE_CONFLICT');

  await removeStoredFile(deletedLoan.salarySlip.deleteUrl);
  return { loanId: String(deletedLoan._id), status: deletedLoan.status };
};
