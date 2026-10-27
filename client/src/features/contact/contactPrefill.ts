import type { InquiryType } from '@roman/shared';
import { INQUIRY_TYPES, isOneOf } from '@roman/shared/lite';

export interface ContactPrefill {
  inquiryType?: InquiryType;
  message?: string;
}

/** Longest score title carried into the message (the catalogue's own limit). */
const MAX_SCORE_TITLE = 150;

/**
 * What a link into the contact form chose in advance: `?type=lessons` picks the enquiry type
 * ("What I do" buttons), `?score=Title` asks for a score (Sheet music page).
 */
export function contactPrefill(search: URLSearchParams): ContactPrefill {
  const score = search.get('score')?.trim().slice(0, MAX_SCORE_TITLE);
  if (score) return { inquiryType: 'sheet-music', message: `I’d like the score for “${score}”.` };
  const type = search.get('type');
  return isOneOf(INQUIRY_TYPES, type) ? { inquiryType: type } : {};
}
