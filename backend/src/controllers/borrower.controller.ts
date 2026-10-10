import { Request, Response } from 'express';

import {
  createLoanApplication,
  getBorrowerLoan,
  getBorrowerProfile,
  getBorrowerSalarySlip,
  updateBorrowerProfile,
} from '../services/loan.service';
import { AppError } from '../utils/app-error';

export const getProfile = async (req: Request, res: Response): Promise<void> => {
  const result = await getBorrowerProfile(req.auth!.userId);
  res.status(200).json({
    profile: result.profile,
    eligibility: result.eligibility,
  });
};

export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  const result = await updateBorrowerProfile(req.auth!.userId, req.body);
  res.status(200).json({
    profile: result.profile,
    eligibility: result.eligibility,
  });
};

export const applyForLoan = async (req: Request, res: Response): Promise<void> => {
  if (!req.file) throw new AppError(422, 'A salary slip is required.', 'SALARY_SLIP_REQUIRED');
  const loan = await createLoanApplication(req.auth!.userId, Number(req.body.amount), Number(req.body.tenureDays), req.file);
  res.status(201).json({ loan });
};

export const getLoan = async (req: Request, res: Response): Promise<void> => {
  const loan = await getBorrowerLoan(req.auth!.userId);
  res.status(200).json({ loan });
};

export const getSalarySlip = async (req: Request, res: Response): Promise<void> => {
  const salarySlip = await getBorrowerSalarySlip(req.auth!.userId);
  res.setHeader('Content-Type', salarySlip.mimeType);
  res.setHeader('Content-Disposition', 'inline');
  res.status(200).send(salarySlip.content);
};
