import { useSyncExternalStore } from 'react';

import { ViolinLoader } from '@/components/ui/ViolinLoader';
import { isServerWaking, subscribeWaking } from '@/lib/api/wake';

interface PageSpinnerProps {
  label: string;
  /** Before the admin layout exists (session check, page loading): bring its own background. */
  fullPage?: boolean;
}

/** A page-sized loading state in the admin. */
export function PageSpinner({ label, fullPage = false }: PageSpinnerProps) {
  // While the API wakes from sleep, the "tuning up" notice shows the violin and explains the wait,
  // so this steps aside (its label stays for screen readers).
  const waking = useSyncExternalStore(subscribeWaking, isServerWaking);

  return (
    <div
      role="status"
      className={[
        'flex flex-col items-center justify-center gap-4 text-center text-stone-600',
        fullPage ? 'min-h-dvh bg-stone-100' : 'min-h-[50vh]',
      ].join(' ')}
    >
      {!waking && <ViolinLoader className="[--violin-loader-size:5rem]" />}
      <span className={waking ? 'sr-only' : undefined}>{label}</span>
    </div>
  );
}
