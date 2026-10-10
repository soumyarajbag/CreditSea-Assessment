import { Types } from 'mongoose';
import { EpochTimestamp } from '../utils/epoch';

export interface PaymentDocument {
  _id: Types.ObjectId;
  loanId: Types.ObjectId;
  borrowerId: Types.ObjectId;
  utr: string;
  amount: number;
  paymentDate: EpochTimestamp;
  recordedBy: Types.ObjectId;
  createdAt: EpochTimestamp;
  updatedAt: EpochTimestamp;
}
