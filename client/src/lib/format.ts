const NUMERALS: [number, string][] = [
  [10, 'X'],
  [9, 'IX'],
  [5, 'V'],
  [4, 'IV'],
  [1, 'I'],
];

/** 1 → "I", 4 → "IV": section numbers read like movements in a programme (plan §7.1). */
export function toRoman(value: number): string {
  let remaining = Math.max(0, Math.floor(value));
  let result = '';
  for (const [amount, numeral] of NUMERALS) {
    while (remaining >= amount) {
      result += numeral;
      remaining -= amount;
    }
  }
  return result;
}

/** The first four-digit year in a period such as "2019 – 2023" or "2012 – Present". */
export function startYear(period: string): number | undefined {
  const match = /\b(\d{4})\b/.exec(period);
  return match?.[1] ? Number(match[1]) : undefined;
}

/** "3 Oct 2026, 14:05" in the viewer's own time zone: when an admin-side record was created. */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  );
}
