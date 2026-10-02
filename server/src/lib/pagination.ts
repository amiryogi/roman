import type { PaginationMeta } from '@roman/shared';

export function skipFor(page: number, limit: number): number {
  return (page - 1) * limit;
}

export function paginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
