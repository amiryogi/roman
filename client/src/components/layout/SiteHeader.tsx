import { NavLink } from 'react-router';

import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';

import { MobileNav } from './MobileNav';
import { BOOK_PATH, NAV_ITEMS } from './navigation';
import { Wordmark } from './Wordmark';

/** Sticky header: name, navigation (full list from 1280 px, a menu below) and "Book". */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ivory/10 surface-dark">
      <Container className="flex h-16 items-center justify-between gap-6 sm:h-20">
        <Wordmark withViolin />

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-7">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className="relative inline-flex min-h-11 items-center label-caps text-mist transition-colors hover:text-ivory aria-[current=page]:text-ivory aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-0 aria-[current=page]:after:bottom-2 aria-[current=page]:after:h-px aria-[current=page]:after:bg-varnish"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {/* Hidden on phones, where the menu carries "Book Roman". The wrapper is hidden rather
              than the button, whose own display class would otherwise win. */}
          <div className="hidden sm:block">
            <ButtonLink to={BOOK_PATH} variant="outline">
              Book
            </ButtonLink>
          </div>
          <MobileNav className="xl:hidden" />
        </div>
      </Container>
    </header>
  );
}
