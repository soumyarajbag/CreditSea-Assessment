import { NextFunction, Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { AUTH_COOKIE_NAME, Role } from '../constants';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

const getCookie = (req: Request, name: string): string | undefined => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.slice(0, part.indexOf('=')) === name);
  if (!cookie) return undefined;

  try {
    return decodeURIComponent(cookie.slice(name.length + 1));
  } catch {
    return undefined;
  }
};

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const header = req.headers.authorization;
  const bearerToken = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const token = getCookie(req, AUTH_COOKIE_NAME) ?? bearerToken;

  if (!token) {
    next(new AppError(401, 'Authentication is required.', 'UNAUTHENTICATED'));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as AccessTokenPayload;
    if (!payload.sub || !payload.email || !payload.role || !Object.values(Role).includes(payload.role)) {
      throw new Error('Invalid token payload');
    }

    req.auth = { userId: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new AppError(401, 'Invalid or expired authentication token.', 'INVALID_TOKEN'));
  }
};
