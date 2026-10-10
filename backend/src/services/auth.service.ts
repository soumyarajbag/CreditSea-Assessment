import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { env } from '../config/env';
import { Role } from '../constants';
import { UserModel } from '../models/user.model';
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
  const user = await UserModel.create({ email: normalizedEmail, passwordHash, role: Role.BORROWER });
  const publicUser = toPublicUser(user);
  return { token: createToken({ id: String(user._id), email: user.email, role: user.role }), user: publicUser };
};

export const loginUser = async (email: string, password: string) => {
  const user = await UserModel.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
  }

  return {
    token: createToken({ id: String(user._id), email: user.email, role: user.role }),
    user: toPublicUser(user),
  };
};

export const getCurrentUser = async (userId: string) => {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AppError(401, 'User account no longer exists.', 'USER_NOT_FOUND');
  }
  return toPublicUser(user);
};
