import { z } from 'zod';

export const ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'TOKEN_EXPIRED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'ALBUM_NOT_EMPTY',
  'MEDIA_INVALID',
  'MEDIA_PROVIDER_ERROR',
  'RATE_LIMITED',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'INTERNAL_ERROR',
] as const;
export const errorCodeSchema = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof errorCodeSchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

/** Runtime schema for a success envelope around `data`. */
export function apiSuccessSchema<T extends z.ZodType>(data: T) {
  return z.object({
    success: z.literal(true),
    data,
    meta: paginationMetaSchema.optional(),
  });
}

export const apiErrorDetailSchema = z.object({ path: z.string(), message: z.string() });
export type ApiErrorDetail = z.infer<typeof apiErrorDetailSchema>;

export const apiErrorBodySchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.array(apiErrorDetailSchema).optional(),
    requestId: z.string(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>;

export type ApiResponse<T> = ApiSuccess<T> | ApiErrorBody;

/** A page of results as the client sees it after unwrapping the envelope. */
export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}

export const MAX_PAGE_LIMIT = 50;

/** `?page=&limit=` with a per-resource default limit. Unknown query keys are ignored. */
export function paginationQuerySchema(defaultLimit: number) {
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(MAX_PAGE_LIMIT).default(defaultLimit),
  });
}

export const healthDtoSchema = z.object({
  status: z.enum(['ok', 'degraded']),
  db: z.enum(['up', 'down']),
  uptime: z.number().nonnegative(),
  version: z.string(),
});
export type HealthDto = z.infer<typeof healthDtoSchema>;
