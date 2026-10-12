import { Router } from 'express';

import { login, logout, me, resendVerification, signup, verifyEmail } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { emailVerificationSchema, loginSchema, resendVerificationSchema, signupSchema } from '../validators/auth.validator';
import { asyncHandler } from '../utils/async-handler';

export const authRouter = Router();

authRouter.post('/signup', validateBody(signupSchema), asyncHandler(signup));
authRouter.post('/login', validateBody(loginSchema), asyncHandler(login));
authRouter.post('/verify-email', validateBody(emailVerificationSchema), asyncHandler(verifyEmail));
authRouter.post('/resend-verification', validateBody(resendVerificationSchema), asyncHandler(resendVerification));
authRouter.post('/logout', asyncHandler(logout));
authRouter.get('/me', requireAuth, asyncHandler(me));
