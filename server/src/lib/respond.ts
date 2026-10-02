import type { Response } from 'express';

import type { ApiSuccess, PaginationMeta } from '@roman/shared';

/**
 * Sends the standard success envelope (plan §10.1). Handlers build `data` from a mapper,
 * whose return type is the shared DTO, so the payload is typed at its source.
 */
export function sendData(
  res: Response,
  data: unknown,
  options: { status?: number; meta?: PaginationMeta } = {},
): void {
  const body: ApiSuccess<unknown> = options.meta
    ? { success: true, data, meta: options.meta }
    : { success: true, data };
  res.status(options.status ?? 200).json(body);
}

export function sendNoContent(res: Response): void {
  res.status(204).end();
}
