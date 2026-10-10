import { NextFunction, Request, RequestHandler, Response } from 'express';
import { z } from 'zod';

export const validateBody = (schema: z.ZodTypeAny): RequestHandler => {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
};
