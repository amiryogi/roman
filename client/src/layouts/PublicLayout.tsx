import { Outlet, ScrollRestoration } from 'react-router';

import { RouteAnnouncer } from '@/components/layout/RouteAnnouncer';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SkipLink } from '@/components/layout/SkipLink';
import { useAudioPlayer } from '@/features/audio/AudioPlayerContext';
import { AudioPlayerProvider } from '@/features/audio/AudioPlayerProvider';
import { PLAYER_BAR_PADDING, PlayerBar } from '@/features/audio/PlayerBar';

const MAIN_ID = 'main';

/**
 * Frame for every public page (plan §12.1). The audio player lives here, above the routed pages,
 * so playback survives navigation. Admin pages don't use this layout, so they have no player.
 */
export function PublicLayout() {
  return (
    <AudioPlayerProvider>
      <Frame />
    </AudioPlayerProvider>
  );
}

function Frame() {
  const { state } = useAudioPlayer();

  return (
    // While the player is open the page gets matching bottom padding, so the bar never covers
    // content such as a form's submit button (plan §7.4).
    <div
      className={['flex min-h-dvh flex-col bg-ebony', state.visible ? PLAYER_BAR_PADDING : '']
        .filter(Boolean)
        .join(' ')}
    >
      <SkipLink />
      <SiteHeader />
      {/* At least one screen tall, so the footer never sits in view while a page loads and then
          jumps down when content arrives (layout shift). */}
      <main id={MAIN_ID} tabIndex={-1} className="min-h-svh flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <PlayerBar />
      <RouteAnnouncer mainId={MAIN_ID} />
      <ScrollRestoration />
    </div>
  );
}
