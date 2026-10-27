import { describe, expect, it } from 'vitest';

import { whatsAppUrl } from './whatsApp';

describe('whatsAppUrl', () => {
  it('links numbers written in international form', () => {
    expect(whatsAppUrl('+977 (980) 000-0000')).toBe('https://wa.me/9779800000000');
  });

  it('gives no link without a country code or a number', () => {
    expect(whatsAppUrl('9800000000')).toBeUndefined();
    expect(whatsAppUrl('+12')).toBeUndefined();
    expect(whatsAppUrl(undefined)).toBeUndefined();
  });
});
