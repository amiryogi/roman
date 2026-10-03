import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { ApiClientError } from '@/lib/api/client';

/**
 * Puts the server's 422 `details` on the matching form fields (plan §12.4). Paths are checked
 * against the form's known fields, so nothing is cast. Returns true when at least one field got
 * an error, in which case the first one receives focus.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiClientError) || error.details.length === 0) return false;
  let applied = false;
  for (const detail of error.details) {
    const field = fields.find((name) => name === detail.path || detail.path.startsWith(`${name}.`));
    if (!field) continue;
    setError(field, { type: 'server', message: detail.message }, { shouldFocus: !applied });
    applied = true;
  }
  return applied;
}
