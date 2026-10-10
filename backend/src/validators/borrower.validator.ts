import { z } from 'zod';

import { EmploymentMode, PAN_REGEX } from '../constants';

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  pan: z.string().trim().toUpperCase().regex(PAN_REGEX, 'PAN must be 10 characters: 5 letters, 4 digits, then 1 letter.'),
  dateOfBirth: z.union([z.number().int().positive(), z.string().trim().min(1)]),
  monthlySalary: z.coerce.number().finite().min(0),
  employmentMode: z.nativeEnum(EmploymentMode),
});

export const applyLoanSchema = z.object({
  amount: z.coerce.number().int().min(50000).max(500000),
  tenureDays: z.coerce.number().int().min(30).max(365),
});
