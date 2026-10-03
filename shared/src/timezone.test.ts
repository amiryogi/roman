import { describe, expect, it } from 'vitest';

import { isoToZonedLocal, zonedLocalToIso, zoneOffsetMinutes } from './timezone.js';

describe('time zones', () => {
  it('knows Kathmandu is UTC+05:45', () => {
    expect(zoneOffsetMinutes(new Date('2026-11-02T00:00:00Z'), 'Asia/Kathmandu')).toBe(345);
  });

  it('converts Kathmandu wall time to UTC and back', () => {
    expect(zonedLocalToIso('2026-11-02T19:00', 'Asia/Kathmandu')).toBe('2026-11-02T13:15:00.000Z');
    expect(isoToZonedLocal('2026-11-02T13:15:00.000Z', 'Asia/Kathmandu')).toBe('2026-11-02T19:00');
  });

  it('handles zones with daylight saving', () => {
    // London is UTC+1 in summer and UTC in winter.
    expect(zonedLocalToIso('2026-07-01T20:00', 'Europe/London')).toBe('2026-07-01T19:00:00.000Z');
    expect(zonedLocalToIso('2026-12-01T20:00', 'Europe/London')).toBe('2026-12-01T20:00:00.000Z');
  });

  it('rejects values that are not datetime-local strings', () => {
    expect(zonedLocalToIso('', 'Asia/Kathmandu')).toBeUndefined();
    expect(zonedLocalToIso('2026-11-02', 'Asia/Kathmandu')).toBeUndefined();
  });
});
