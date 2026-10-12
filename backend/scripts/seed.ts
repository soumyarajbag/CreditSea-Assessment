import bcrypt from 'bcryptjs';

import { connectDatabase, disconnectDatabase } from '../src/config/database';
import { Role } from '../src/constants';
import { UserModel } from '../src/models/user.model';

const seedUsers = [
  { role: Role.ADMIN, email: 'admin@lms.test', fullName: 'LMS Admin' },
  { role: Role.SALES, email: 'sales@lms.test', fullName: 'Sales Executive' },
  { role: Role.SANCTION, email: 'sanction@lms.test', fullName: 'Sanction Executive' },
  { role: Role.DISBURSEMENT, email: 'disbursement@lms.test', fullName: 'Disbursement Executive' },
  { role: Role.COLLECTION, email: 'collection@lms.test', fullName: 'Collection Executive' },
  { role: Role.BORROWER, email: 'borrower@lms.test', fullName: 'Demo Borrower' },
];

const run = async (): Promise<void> => {
  await connectDatabase();
  const passwordHash = await bcrypt.hash('Password123!', 12);
  for (const seedUser of seedUsers) {
    await UserModel.updateOne(
      { email: seedUser.email },
      {
        $set: { ...seedUser, passwordHash, profileCompleted: false, emailVerified: true },
        $unset: { emailVerificationTokenHash: 1, emailVerificationExpiresAt: 1 },
      },
      { upsert: true },
    );
  }
  console.log('Seeded LMS users. Password for every account: Password123!');
  await disconnectDatabase();
};

run().catch(async (error) => {
  console.error(error);
  await disconnectDatabase();
  process.exit(1);
});
