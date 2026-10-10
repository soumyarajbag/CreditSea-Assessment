import { ErrorRequestHandler, NextFunction, Request, Response } from 'express';
import { Error as MongooseError } from 'mongoose';
import { MulterError } from 'multer';
import { ZodError } from 'zod';

import { AppError } from '../utils/app-error';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`, 'NOT_FOUND'));
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ message: error.message, code: error.code, errors: error.details ?? [] });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      message: 'Validation failed.',
      code: 'VALIDATION_ERROR',
      errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }

  if (error instanceof MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Salary slip must be 5 MB or smaller.' : error.message;
    res.status(422).json({ message, code: 'FILE_UPLOAD_ERROR', errors: [] });
    return;
  }

  if (error instanceof MongooseError.ValidationError) {
    res.status(422).json({
      message: 'Database validation failed.',
      code: 'DATABASE_VALIDATION_ERROR',
      errors: Object.values(error.errors).map((item) => ({ field: item.path, message: item.message })),
    });
    return;
  }

  if ((error as { code?: number }).code === 11000) {
    res.status(409).json({ message: 'A record with the same unique value already exists.', code: 'DUPLICATE_VALUE', errors: [] });
    return;
  }

  if (error instanceof Error && error.message.includes('Salary slip must be')) {
    res.status(422).json({ message: error.message, code: 'INVALID_FILE_TYPE', errors: [] });
    return;
  }

  console.error(error);
  res.status(500).json({ message: 'An unexpected server error occurred.', code: 'INTERNAL_ERROR', errors: [] });
};
