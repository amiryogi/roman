import { Outlet, ScrollRestoration } from 'react-router';

import { RouteAnnouncer } from '@/components/layout/RouteAnnouncer';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SkipLink } from '@/components/layout/SkipLink';

const MAIN_ID = 'main';

/**
 * Frame for every public page (plan §12.1). The audio player joins it in Phase 6, mounted here
 * so playback survives navigation.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-ebony">
      <SkipLink />
      <SiteHeader />
      {/* At least one screen tall, so the footer never sits in view while a page loads and then
          jumps down when content arrives (layout shift). */}
      <main id={MAIN_ID} tabIndex={-1} className="min-h-svh flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <RouteAnnouncer mainId={MAIN_ID} />
      <ScrollRestoration />
    </div>
  );
}
