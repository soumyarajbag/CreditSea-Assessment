import { Schema, model } from 'mongoose';

import { EmploymentMode, Role } from '../constants';
import { UserDocument } from '../types';
import { nowEpoch } from '../utils/epoch';

const userSchema = new Schema<UserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(Role), default: Role.BORROWER, required: true, index: true },
    fullName: { type: String, trim: true },
    pan: { type: String, uppercase: true, trim: true },
    dateOfBirth: { type: Number },
    monthlySalary: { type: Number, min: 0 },
    employmentMode: { type: String, enum: Object.values(EmploymentMode) },
    profileCompleted: { type: Boolean, default: false },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true },
  },
  { timestamps: { currentTime: nowEpoch }, versionKey: false },
);

export const UserModel = model<UserDocument>('User', userSchema);
