import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { Role } from '../constants';
import { UserModel } from '../models/user.model';
import { createVerificationToken, getVerificationExpiry, hashVerificationToken, sendVerificationEmail } from './email.service';
import { AppError } from '../utils/app-error';
import { toPublicUser } from '../utils/public-user';

const SALT_ROUNDS = 12;

const createToken = (user: { id: string; email: string; role: Role }): string =>
  jwt.sign({ sub: user.id, email: user.email, role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });

export const registerBorrower = async (email: string, password: string) => {
  const normalizedEmail = email.toLowerCase();
  const existing = await UserModel.exists({ email: normalizedEmail });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists.', 'EMAIL_ALREADY_EXISTS');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verificationToken = createVerificationToken();
  await UserModel.create({
    email: normalizedEmail,
    passwordHash,
    role: Role.BORROWER,
    emailVerified: false,
    emailVerificationTokenHash: hashVerificationToken(verificationToken),
    emailVerificationExpiresAt: getVerificationExpiry(),
  });

  await sendVerificationEmail(normalizedEmail, verificationToken);

  return {
    email: normalizedEmail,
    verificationRequired: true,
    verificationExpiresHours: Math.max(1, env.emailVerificationExpiresHours),
  };
};

export const loginUser = async (email: string, password: string) => {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  }

  if (!user.emailVerified) {
    throw new AppError(403, 'Please verify your email before signing in.', 'EMAIL_NOT_VERIFIED');
  }

  return {
    token: createToken({ id: String(user._id), email: user.email, role: user.role }),
    user: toPublicUser(user),
  };
};

export const verifyUserEmail = async (token: string) => {
  const user = await UserModel.findOne({
    emailVerificationTokenHash: hashVerificationToken(token),
    emailVerificationExpiresAt: { $gt: Date.now() },
  }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');

  if (!user) {
    throw new AppError(400, 'This verification link is invalid or has expired.', 'EMAIL_VERIFICATION_INVALID');
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  user.emailVerificationExpiresAt = undefined;
  await user.save();

  return { message: 'Email verified successfully. You can now sign in.' };
};

export const resendVerificationEmail = async (email: string) => {
  const normalizedEmail = email.toLowerCase();
  const user = await UserModel.findOne({ email: normalizedEmail }).select('+emailVerificationTokenHash +emailVerificationExpiresAt');

  if (!user || user.emailVerified) {
    return { message: 'If an unverified account exists for this email, a new verification link has been sent.' };
  }

  const verificationToken = createVerificationToken();
  user.emailVerificationTokenHash = hashVerificationToken(verificationToken);
  user.emailVerificationExpiresAt = getVerificationExpiry();
  await user.save();
  await sendVerificationEmail(normalizedEmail, verificationToken);

  return { message: 'If an unverified account exists for this email, a new verification link has been sent.' };
};

export const getCurrentUser = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(401, 'User account no longer exists.', 'USER_NOT_FOUND');
  }
  return toPublicUser(user);
};
