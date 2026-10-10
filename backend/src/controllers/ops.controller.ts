import { Request, Response } from 'express';

import { LoanStatus } from '../constants';
import {
  disburseLoan,
  getDisbursementHistory,
  getCollectionLoans,
  getCollectionHistory,
  getDisbursementLoans,
  getOperationsLoan,
  getSalesLeads,
  getSanctionHistory,
  getSanctionLoans,
  recordPayment,
  sanctionLoan,
  deleteBorrowerWithoutLoanHistory,
  deleteNonFinancialLoanApplication,
} from '../services/loan.service';
import { parseOptionalStatus, parsePagination } from '../utils/pagination';

export const salesLeads = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getSalesLeads(parsePagination(req.query)));
};

export const sanctionLoans = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getSanctionLoans(parsePagination(req.query)));
};

export const sanctionHistory = async (req: Request, res: Response): Promise<void> => {
  const status = parseOptionalStatus(req.query, [LoanStatus.SANCTIONED, LoanStatus.REJECTED, LoanStatus.DISBURSED, LoanStatus.CLOSED]);
  res.status(200).json(await getSanctionHistory(parsePagination(req.query), status));
};

export const sanction = async (req: Request, res: Response): Promise<void> => {
  const loan = await sanctionLoan(String(req.params.id), req.auth!.userId, req.body.decision, req.body.reason);
  res.status(200).json({ loan });
};

export const disbursementLoans = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getDisbursementLoans(parsePagination(req.query)));
};

export const disbursementHistory = async (req: Request, res: Response): Promise<void> => {
  const status = parseOptionalStatus(req.query, [LoanStatus.DISBURSED, LoanStatus.CLOSED]);
  res.status(200).json(await getDisbursementHistory(parsePagination(req.query), status));
};

export const disburse = async (req: Request, res: Response): Promise<void> => {
  const loan = await disburseLoan(String(req.params.id), req.auth!.userId);
  res.status(200).json({ loan });
};

export const collectionLoans = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json(await getCollectionLoans(parsePagination(req.query)));
};

export const collectionHistory = async (req: Request, res: Response): Promise<void> => {
  const status = parseOptionalStatus(req.query, [LoanStatus.DISBURSED, LoanStatus.CLOSED]);
  res.status(200).json(await getCollectionHistory(parsePagination(req.query), status));
};

export const addPayment = async (req: Request, res: Response): Promise<void> => {
  const loan = await recordPayment(String(req.params.id), req.auth!.userId, req.body);
  res.status(201).json({ loan });
};

export const loanDetails = async (req: Request, res: Response): Promise<void> => {
  const loan = await getOperationsLoan(String(req.params.id), req.auth!.role);
  res.status(200).json({ loan });
};

export const deleteBorrower = async (req: Request, res: Response): Promise<void> => {
  const result = await deleteBorrowerWithoutLoanHistory(String(req.params.id));
  res.status(200).json({ deleted: true, ...result });
};

export const deleteLoanApplication = async (req: Request, res: Response): Promise<void> => {
  const result = await deleteNonFinancialLoanApplication(String(req.params.id));
  res.status(200).json({ deleted: true, ...result });
};
