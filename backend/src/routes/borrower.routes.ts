import { Router } from 'express';

import { applyForLoan, getLoan, getProfile, getSalarySlip, updateProfile } from '../controllers/borrower.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import { salarySlipUpload } from '../middleware/upload.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { Role } from '../constants';
import { asyncHandler } from '../utils/async-handler';
import { applyLoanSchema, profileSchema } from '../validators/borrower.validator';

export const borrowerRouter = Router();
const borrowerOnly = [requireAuth, authorizeRoles(Role.BORROWER)];

borrowerRouter.get('/profile', ...borrowerOnly, asyncHandler(getProfile));
borrowerRouter.put('/profile', ...borrowerOnly, validateBody(profileSchema), asyncHandler(updateProfile));
borrowerRouter.post(
  '/loans/apply',
  ...borrowerOnly,
  salarySlipUpload.single('salarySlip'),
  validateBody(applyLoanSchema),
  asyncHandler(applyForLoan),
);
borrowerRouter.get('/loans/current/salary-slip', ...borrowerOnly, asyncHandler(getSalarySlip));
borrowerRouter.get('/loans/current', ...borrowerOnly, asyncHandler(getLoan));
