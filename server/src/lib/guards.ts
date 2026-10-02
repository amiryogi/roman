export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** MongoDB duplicate-key error (E11000), without depending on the driver's classes. */
export function isDuplicateKeyError(
  error: unknown,
): error is { code: 11000; keyValue?: Record<string, unknown> } {
  return isRecord(error) && error.code === 11000;
}

/** Errors raised by Express's body parser carry a `type` such as "entity.too.large". */
export function isBodyParserError(error: unknown): error is { type: string; status: number } {
  return isRecord(error) && typeof error.type === 'string' && typeof error.status === 'number';
}
