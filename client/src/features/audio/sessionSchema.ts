import { z } from 'zod';

import { trackDtoSchema } from '@roman/shared';

import type { SavedSession } from './persistence';
import { MAX_SAVED_QUEUE } from './sessionLimits';

const savedSessionSchema = z.object({
  queue: z.array(trackDtoSchema).min(1).max(MAX_SAVED_QUEUE),
  index: z.number().int().min(0),
  position: z.number().min(0),
  volume: z.number().min(0).max(1),
});

/** A stored player session, or undefined if it is malformed or from an older version. */
export function parseSavedSession(value: unknown): SavedSession | undefined {
  const parsed = savedSessionSchema.safeParse(value);
  if (!parsed.success || parsed.data.index >= parsed.data.queue.length) return undefined;
  return parsed.data;
}
