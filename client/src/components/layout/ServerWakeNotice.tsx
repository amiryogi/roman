import { ViolinLoader } from '@/components/ui/ViolinLoader';

/**
 * Shown while the API wakes from sleep: the free hosting rests after 15 quiet minutes and takes up
 * to a minute to start (plan §0.4). It floats over the page's own placeholders and lets clicks
 * through, so the header and menu stay usable. Mounted on demand by lib/api/wakeNotice.tsx.
 */
export function ServerWakeNotice() {
  return (
    <div className="server-wake">
      <div role="status" className="server-wake-card surface-dark-raised motion-safe:animate-rise">
        <ViolinLoader className="[--violin-loader-size:8rem]" />
        <p className="font-display text-[1.75rem] leading-tight font-medium">Tuning up…</p>
        <p className="text-sm text-(--muted)">
          The site has been resting and is waking up. This can take up to a minute.
        </p>
      </div>
    </div>
  );
}
