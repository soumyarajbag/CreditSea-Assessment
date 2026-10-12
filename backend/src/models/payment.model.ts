import { Schema, Types, model } from 'mongoose';

import { PaymentDocument } from '../types/payment';
import { nowEpoch } from '../utils/epoch';

const paymentSchema = new Schema<PaymentDocument>(
  {
    loanId: { type: Schema.Types.ObjectId, ref: 'Loan', required: true, index: true },
    borrowerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    utr: { type: String, required: true, unique: true, trim: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentDate: { type: Number, required: true },
    recordedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Number, required: true, default: nowEpoch },
    updatedAt: { type: Number, required: true, default: nowEpoch },
  },
  { timestamps: { currentTime: nowEpoch }, versionKey: false },
);

export const PaymentModel = model<PaymentDocument>('Payment', paymentSchema);
