/** Date → "YYYY-MM-DD" (UTC). Calendar dates are stored as UTC midnight. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** "YYYY-MM-DD" → Date at UTC midnight. */
export function fromIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function optionalIsoDate(date: Date | undefined): string | undefined {
  return date ? toIsoDate(date) : undefined;
}

export function optionalIsoDateTime(date: Date | undefined): string | undefined {
  return date ? date.toISOString() : undefined;
}
