import { describe, expect, it } from 'vitest';

import { contactPrefill } from './contactPrefill';

describe('contactPrefill', () => {
  it('picks a known enquiry type', () => {
    expect(contactPrefill(new URLSearchParams('type=lessons'))).toEqual({ inquiryType: 'lessons' });
  });

  it('ignores unknown types', () => {
    expect(contactPrefill(new URLSearchParams('type=free-concert'))).toEqual({});
    expect(contactPrefill(new URLSearchParams())).toEqual({});
  });

  it('asks for a score by its title', () => {
    expect(contactPrefill(new URLSearchParams('type=booking&score=Jingle%20Bell%20Rock'))).toEqual({
      inquiryType: 'sheet-music',
      message: 'I’d like the score for “Jingle Bell Rock”.',
    });
  });
});
