import { Router } from 'express';

import { Role } from '../constants';
import {
  addPayment,
  collectionHistory,
  collectionLoans,
  deleteBorrower,
  deleteLoanApplication,
  disburse,
  disbursementHistory,
  disbursementLoans,
  loanDetails,
  salesLeads,
  sanction,
  sanctionHistory,
  sanctionLoans,
} from '../controllers/ops.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { authorizeRoles } from '../middleware/rbac.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { paymentSchema, sanctionDecisionSchema } from '../validators/ops.validator';

export const opsRouter = Router();

opsRouter.get('/sales/leads', requireAuth, authorizeRoles(Role.SALES, Role.ADMIN), asyncHandler(salesLeads));
opsRouter.get('/sanction/loans', requireAuth, authorizeRoles(Role.SANCTION, Role.ADMIN), asyncHandler(sanctionLoans));
opsRouter.get('/sanction/history', requireAuth, authorizeRoles(Role.SANCTION, Role.ADMIN), asyncHandler(sanctionHistory));
opsRouter.patch(
  '/loans/:id/sanction',
  requireAuth,
  authorizeRoles(Role.SANCTION, Role.ADMIN),
  validateBody(sanctionDecisionSchema),
  asyncHandler(sanction),
);
opsRouter.get('/disbursement/loans', requireAuth, authorizeRoles(Role.DISBURSEMENT, Role.ADMIN), asyncHandler(disbursementLoans));
opsRouter.get('/disbursement/history', requireAuth, authorizeRoles(Role.DISBURSEMENT, Role.ADMIN), asyncHandler(disbursementHistory));
opsRouter.patch('/loans/:id/disburse', requireAuth, authorizeRoles(Role.DISBURSEMENT, Role.ADMIN), asyncHandler(disburse));
opsRouter.get('/collection/loans', requireAuth, authorizeRoles(Role.COLLECTION, Role.ADMIN), asyncHandler(collectionLoans));
opsRouter.get('/collection/history', requireAuth, authorizeRoles(Role.COLLECTION, Role.ADMIN), asyncHandler(collectionHistory));
opsRouter.post(
  '/loans/:id/payments',
  requireAuth,
  authorizeRoles(Role.COLLECTION, Role.ADMIN),
  validateBody(paymentSchema),
  asyncHandler(addPayment),
);
opsRouter.get(
  '/loans/:id',
  requireAuth,
  authorizeRoles(Role.ADMIN, Role.SANCTION, Role.DISBURSEMENT, Role.COLLECTION),
  asyncHandler(loanDetails),
);
opsRouter.delete('/borrowers/:id', requireAuth, authorizeRoles(Role.ADMIN), asyncHandler(deleteBorrower));
opsRouter.delete('/loans/:id', requireAuth, authorizeRoles(Role.ADMIN), asyncHandler(deleteLoanApplication));
