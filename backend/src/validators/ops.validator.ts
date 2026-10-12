import { z } from 'zod';

import { UTR_REGEX } from '../constants';

export const sanctionDecisionSchema = z
  .object({
    decision: z.enum(['approve', 'reject']),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((value, context) => {
    if (value.decision === 'reject' && !value.reason) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A rejection reason is required.' });
    }
  });

export const sanctionReviewSchema = z.object({
  reason: z.string().trim().min(1, 'A review comment is required.').max(500, 'The review comment cannot exceed 500 characters.'),
});

export const paymentSchema = z.object({
  utr: z.string().trim().toUpperCase().regex(UTR_REGEX, 'UTR must be 6–30 characters using letters, digits, and optional hyphens.'),
  amount: z.coerce.number().finite().positive(),
  paymentDate: z.union([z.number().int().positive(), z.string().trim().min(1)]),
});
