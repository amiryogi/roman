import { z } from 'zod';

import {
  albumDetailDtoSchema,
  albumDtoSchema,
  apiErrorBodySchema,
  authResponseDtoSchema,
  eventDtoSchema,
  galleryImageDtoSchema,
  homeDtoSchema,
  inquiryFormTokenDtoSchema,
  inquiryReceiptDtoSchema,
  paginationMetaSchema,
  profileDtoSchema,
  trackDtoSchema,
  videoDtoSchema,
  type ApiErrorBody,
  type Paginated,
} from '@roman/shared';

// Loaded on demand by client.ts (`import('./validation')`), in parallel with the request, so Zod
// and the schemas aren't part of the public pages' initial JavaScript (plan §16). Every public
// page preloads it, so it holds only the response schemas public requests pick from; admin code
// passes its own schemas.

export const schemas = {
  albumDetailDtoSchema,
  albumDtoSchema,
  authResponseDtoSchema,
  eventDtoSchema,
  galleryImageDtoSchema,
  homeDtoSchema,
  inquiryFormTokenDtoSchema,
  inquiryReceiptDtoSchema,
  profileDtoSchema,
  trackDtoSchema,
  videoDtoSchema,
};
export type ResponseSchemas = typeof schemas;

// The envelope is checked first, then `data` against the endpoint's own schema.
const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: paginationMetaSchema.optional(),
});

/** `data` of a success envelope, validated; undefined if anything doesn't match. */
export function parseData<S extends z.ZodType>(body: unknown, schema: S): z.output<S> | undefined {
  const envelope = successEnvelopeSchema.safeParse(body);
  if (!envelope.success) return undefined;
  const data = schema.safeParse(envelope.data.data);
  return data.success ? data.data : undefined;
}

/** A paginated list: every item validated, and the pagination `meta` required. */
export function parsePage<S extends z.ZodType>(
  body: unknown,
  itemSchema: S,
): Paginated<z.output<S>> | undefined {
  const envelope = successEnvelopeSchema.safeParse(body);
  if (!envelope.success || !envelope.data.meta) return undefined;
  const items = z.array(itemSchema).safeParse(envelope.data.data);
  return items.success ? { items: items.data, meta: envelope.data.meta } : undefined;
}

export function parseErrorBody(body: unknown): ApiErrorBody['error'] | undefined {
  const parsed = apiErrorBodySchema.safeParse(body);
  return parsed.success ? parsed.data.error : undefined;
}
