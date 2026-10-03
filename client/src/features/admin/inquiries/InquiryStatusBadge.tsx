import type { InquiryStatus } from '@roman/shared';

import { INQUIRY_STATUS_LABELS } from '@/lib/labels';

const TONES: Record<InquiryStatus, string> = {
  new: 'bg-amber-100 text-amber-950',
  read: 'bg-sky-100 text-sky-950',
  replied: 'bg-emerald-100 text-emerald-900',
  archived: 'bg-stone-200 text-stone-800',
};

/** Text carries the meaning; colour only reinforces it (plan §18). */
export function InquiryStatusBadge({ status }: { status: InquiryStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium ${TONES[status]}`}
    >
      {INQUIRY_STATUS_LABELS[status]}
    </span>
  );
}
