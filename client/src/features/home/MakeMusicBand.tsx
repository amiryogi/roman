import { BOOK_PATH } from '@/components/layout/navigation';
import { buttonClass } from '@/components/ui/buttonClass';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';

import { whatsAppUrl } from './whatsApp';

/**
 * The home page's closing call to action, centred as on the reference design. States no facts,
 * only an invitation. WhatsApp appears only when the owner chose to show their phone number.
 */
export function MakeMusicBand({ tone, phone }: { tone: 'dark' | 'dark-raised'; phone?: string }) {
  const whatsApp = whatsAppUrl(phone);
  return (
    <section
      aria-labelledby="make-music-title"
      className={`${tone === 'dark' ? 'surface-dark' : 'surface-dark-raised'} stage-light`}
    >
      <Container className="flex flex-col items-center py-24 text-center sm:py-32">
        <p className="eyebrow" aria-hidden="true">
          Let’s make music
        </p>
        <h2
          id="make-music-title"
          className="mt-4 max-w-4xl font-display text-[2.25rem] leading-[1.1] text-balance sm:text-[3.5rem]"
        >
          Let’s bring the violin to your next project
        </h2>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-(--muted)">
          Weddings, concerts, private events, studio sessions and violin lessons. Share the date,
          the place and the music you have in mind.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink to={BOOK_PATH}>
            Book me <span aria-hidden="true">→</span>
          </ButtonLink>
          {whatsApp && (
            <a
              href={whatsApp}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClass('outline')}
            >
              WhatsApp<span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </Container>
    </section>
  );
}
