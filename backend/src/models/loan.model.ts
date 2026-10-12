import { Schema, model } from 'mongoose';

import { ALLOWED_SALARY_SLIP_MIME_TYPES, INTEREST_RATE, LoanStatus } from '../constants';
import { LoanDocument } from '../types';
import { nowEpoch } from '../utils/epoch';

const salarySlipSchema = new Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, required: true, trim: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, enum: ALLOWED_SALARY_SLIP_MIME_TYPES, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
  },
  { _id: false, versionKey: false },
);

const loanSchema = new Schema<LoanDocument>(
  {
    borrowerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 50000, max: 500000 },
    tenureDays: { type: Number, required: true, min: 30, max: 365 },
    interestRate: { type: Number, required: true, default: INTEREST_RATE },
    simpleInterest: { type: Number, required: true, min: 0 },
    totalRepayment: { type: Number, required: true, min: 0 },
    totalPaid: { type: Number, required: true, default: 0, min: 0 },
    status: { type: String, enum: Object.values(LoanStatus), default: LoanStatus.APPLIED, required: true, index: true },
    rejectionReason: { type: String, trim: true },
    salarySlip: { type: salarySlipSchema, required: true },
    sanctionedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    sanctionedAt: { type: Number },
    disbursedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    disbursedAt: { type: Number },
    closedAt: { type: Number },
    createdAt: { type: Number, required: true, default: nowEpoch },
    updatedAt: { type: Number, required: true, default: nowEpoch },
  },
  { timestamps: { currentTime: nowEpoch }, versionKey: false },
);

loanSchema.index({ status: 1, createdAt: -1 });

export const LoanModel = model<LoanDocument>('Loan', loanSchema);
