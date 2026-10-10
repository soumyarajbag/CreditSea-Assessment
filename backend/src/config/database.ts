import mongoose from 'mongoose';

import { LoanModel } from '../models/loan.model';
import { PaymentModel } from '../models/payment.model';
import { UserModel } from '../models/user.model';
import { env } from './env';

const epochExpression = (field: string) => ({
  $cond: [
    { $eq: [{ $type: `$${field}` }, 'date'] },
    { $toLong: `$${field}` },
    {
      $cond: [{ $in: [{ $type: `$${field}` }, ['double', 'int', 'long', 'decimal']] }, `$${field}`, '$$REMOVE'],
    },
  ],
});

const migrateLegacyCollection = async (
  collection: { updateMany: (...args: any[]) => Promise<unknown> },
  dateFields: string[],
  versionFields: string[],
) => {
  const dateFilters = dateFields.map((field) => ({ [field]: { $type: 'date' } }));
  const versionFilters = versionFields.map((field) => ({ [field]: { $exists: true } }));
  const pipeline = [
    { $set: Object.fromEntries(dateFields.map((field) => [field, epochExpression(field)])) },
    ...versionFields.map((field) => ({ $unset: field })),
  ];

  await collection.updateMany({ $or: [...dateFilters, ...versionFilters] }, pipeline);
};

const migrateLegacyDatabaseValues = async (): Promise<void> => {
  await migrateLegacyCollection(UserModel.collection, ['dateOfBirth', 'createdAt', 'updatedAt'], ['__v']);
  await migrateLegacyCollection(
    LoanModel.collection,
    ['sanctionedAt', 'disbursedAt', 'closedAt', 'createdAt', 'updatedAt'],
    ['__v', 'salarySlip.__v'],
  );
  await migrateLegacyCollection(PaymentModel.collection, ['paymentDate', 'createdAt', 'updatedAt'], ['__v']);
};

export const connectDatabase = async (): Promise<void> => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri);
  await migrateLegacyDatabaseValues();
  console.log('Connected to MongoDB');
};

export const disconnectDatabase = async (): Promise<void> => {
  await mongoose.disconnect();
};
