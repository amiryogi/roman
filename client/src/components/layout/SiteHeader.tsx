import { NavLink } from 'react-router';

import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';

import { MobileNav } from './MobileNav';
import { BOOK_PATH, NAV_ITEMS } from './navigation';
import { Wordmark } from './Wordmark';

/**
 * Sticky header: name, navigation (full list from 1280 px, a menu below) and "Book". Each link has a
 * "string" beneath it (`nav-string`); a varnish string along the bottom shows the scroll position.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ivory/10 surface-dark supports-[backdrop-filter]:bg-ebony/80 supports-[backdrop-filter]:backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6 sm:h-20">
        <Wordmark withViolin />

        <nav aria-label="Main" className="hidden xl:block">
          <ul className="flex items-center gap-7">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className="nav-string inline-flex min-h-11 items-center label-caps text-mist hover:text-ivory aria-[current=page]:text-ivory"
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
      {/* How far down the page the visitor is, drawn as a varnish string. Decorative. */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 -bottom-px h-px scroll-string bg-gradient-to-r from-varnish-deep via-varnish to-varnish-deep"
      />
    </header>
  );
}
