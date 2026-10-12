import { Request, Response } from 'express';

import { AUTH_COOKIE_MAX_AGE_MS, AUTH_COOKIE_NAME } from '../constants';
import { env } from '../config/env';
import { getCurrentUser, loginUser, registerBorrower, resendVerificationEmail, verifyUserEmail } from '../services/auth.service';

const authCookieSameSite: 'none' | 'lax' = env.nodeEnv === 'production' ? 'none' : 'lax';

const authCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: authCookieSameSite,
  maxAge: AUTH_COOKIE_MAX_AGE_MS,
  path: '/',
};

const clearAuthCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: authCookieSameSite,
  path: '/',
};

const setAuthCookie = (res: Response, token: string): void => {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  const result = await registerBorrower(req.body.email, req.body.password);
  res.status(201).json({
    message: 'Account created. Check your email to verify the account before signing in.',
    email: result.email,
    verificationRequired: result.verificationRequired,
    verificationExpiresHours: result.verificationExpiresHours,
  });
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const result = await loginUser(req.body.email, req.body.password);
  setAuthCookie(res, result.token);
  res.status(200).json({ user: result.user });
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.clearCookie(AUTH_COOKIE_NAME, clearAuthCookieOptions);
  res.status(204).send();
};

export const verifyEmail = async (req: Request, res: Response): Promise<void> => {
  const result = await verifyUserEmail(req.body.token);
  res.status(200).json(result);
};

export const resendVerification = async (req: Request, res: Response): Promise<void> => {
  const result = await resendVerificationEmail(req.body.email);
  res.status(202).json(result);
};

export const me = async (req: Request, res: Response): Promise<void> => {
  const user = await getCurrentUser(req.auth!.userId);
  res.status(200).json({ user });
};
