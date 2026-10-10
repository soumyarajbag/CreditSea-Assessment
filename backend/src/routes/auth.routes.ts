import { Router } from 'express';

import { login, logout, me, signup } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { loginSchema, signupSchema } from '../validators/auth.validator';
import { asyncHandler } from '../utils/async-handler';

export const authRouter = Router();

authRouter.post('/signup', validateBody(signupSchema), asyncHandler(signup));
authRouter.post('/login', validateBody(loginSchema), asyncHandler(login));
authRouter.post('/logout', asyncHandler(logout));
authRouter.get('/me', requireAuth, asyncHandler(me));
