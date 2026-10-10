import { Request } from 'express';
import { z } from 'zod';

import { AppError } from './app-error';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  search: z.string().trim().max(100).default(''),
});

export interface PaginationInput {
  page: number;
  pageSize: number;
  search: string;
}

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export const parsePagination = (query: Request['query']): PaginationInput => {
  const result = paginationSchema.safeParse({ page: query.page, pageSize: query.pageSize, search: query.search });
  if (!result.success) {
    throw new AppError(422, 'Invalid pagination parameters.', 'INVALID_PAGINATION', result.error.issues);
  }
  return result.data;
};

export const parseOptionalStatus = <T extends string>(query: Request['query'], allowedStatuses: readonly T[]): T | undefined => {
  if (query.status === undefined) return undefined;
  if (typeof query.status !== 'string' || !allowedStatuses.includes(query.status as T)) {
    throw new AppError(422, 'Invalid status filter.', 'INVALID_STATUS_FILTER', [{ field: 'status', allowed: allowedStatuses }]);
  }
  return query.status as T;
};

export const createPaginationMeta = (page: number, pageSize: number, total: number): PaginationMeta => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};
