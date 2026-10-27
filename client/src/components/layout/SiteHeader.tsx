import { NavLink } from 'react-router';

import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';

import { MobileNav } from './MobileNav';
import { BOOK_PATH, NAV_ITEMS } from './navigation';
import { Wordmark } from './Wordmark';

/**
 * Sticky header (2026-10 revamp): logo, navigation (full list from 1280 px, a menu below) and a
 * crimson "Book me" pill. Transparent over the top of the page, solid black once scrolled
 * (`header-glass`); a crimson string along the bottom shows the scroll position.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 header-glass">
      <Container className="flex h-16 items-center justify-between gap-6 sm:h-20">
        <Wordmark />

        <nav aria-label="Main" className="ml-auto hidden xl:block">
          <ul className="flex items-center gap-7">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className="nav-string inline-flex min-h-11 items-center text-[0.95rem] text-fog hover:text-snow aria-[current=page]:text-snow"
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          {/* Hidden on phones, where the menu carries it. The wrapper is hidden rather than the
              button, whose own display class would otherwise win. */}
          <div className="hidden sm:block">
            <ButtonLink to={BOOK_PATH} className="min-h-10 px-5 text-sm">
              Book me
            </ButtonLink>
          </div>
          <MobileNav className="xl:hidden" />
        </div>
      </Container>
      {/* How far down the page the visitor is, drawn as a crimson string. Decorative. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-px h-px scroll-string bg-linear-to-r from-crimson-deep via-crimson to-crimson-deep"
      />
    </header>
  );
}
