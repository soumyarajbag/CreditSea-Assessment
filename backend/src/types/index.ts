import { Types } from 'mongoose';

import { EmploymentMode, LoanStatus, Role } from '../constants';
import { EpochTimestamp } from '../utils/epoch';

export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
}

export interface SalarySlipMetadata {
  url: string;
  publicId: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
}

export interface UserDocument {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string;
  role: Role;
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  emailVerificationExpiresAt?: EpochTimestamp;
  fullName?: string;
  pan?: string;
  dateOfBirth?: EpochTimestamp;
  monthlySalary?: number;
  employmentMode?: EmploymentMode;
  profileCompleted: boolean;
  createdAt: EpochTimestamp;
  updatedAt: EpochTimestamp;
}

export interface LoanDocument {
  _id: Types.ObjectId;
  borrowerId: Types.ObjectId;
  amount: number;
  tenureDays: number;
  interestRate: number;
  simpleInterest: number;
  totalRepayment: number;
  totalPaid: number;
  status: LoanStatus;
  rejectionReason?: string;
  reviewComment?: string;
  reviewRequestedBy?: Types.ObjectId;
  reviewRequestedAt?: EpochTimestamp;
  salarySlip: SalarySlipMetadata;
  sanctionedBy?: Types.ObjectId;
  sanctionedAt?: EpochTimestamp;
  disbursedBy?: Types.ObjectId;
  disbursedAt?: EpochTimestamp;
  closedAt?: EpochTimestamp;
  createdAt: EpochTimestamp;
  updatedAt: EpochTimestamp;
}
