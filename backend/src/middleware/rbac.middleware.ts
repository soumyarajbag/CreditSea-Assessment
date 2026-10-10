import { NextFunction, Request, Response } from 'express';

import { Role } from '../constants';
import { AppError } from '../utils/app-error';

export const authorizeRoles = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth || !allowedRoles.includes(req.auth.role)) {
      next(new AppError(403, 'You do not have permission to perform this action.', 'FORBIDDEN'));
      return;
    }
    next();
  };
};
