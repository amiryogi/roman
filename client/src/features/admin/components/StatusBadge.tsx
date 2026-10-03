import type { PublicationStatus } from '@roman/shared';

/** Text carries the meaning; colour only reinforces it (plan §18). */
export function StatusBadge({ status }: { status: PublicationStatus }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium',
        status === 'published' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-800',
      ].join(' ')}
    >
      {status === 'published' ? 'Published' : 'Draft'}
    </span>
  );
}
