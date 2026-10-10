import { UserDocument } from '../types';

export const toPublicUser = (user: Partial<UserDocument> & { _id: unknown }) => ({
  id: String(user._id),
  email: user.email,
  role: user.role,
  fullName: user.fullName ?? null,
  pan: user.pan ?? null,
  dateOfBirth: user.dateOfBirth ?? null,
  monthlySalary: user.monthlySalary ?? null,
  employmentMode: user.employmentMode ?? null,
  profileCompleted: Boolean(user.profileCompleted),
});
