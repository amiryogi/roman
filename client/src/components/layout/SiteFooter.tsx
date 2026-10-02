import { Link } from 'react-router';

import { Container } from '@/components/ui/Container';
import { StringsDivider } from '@/components/ui/StringsDivider';

import { BOOK_PATH, NAV_ITEMS } from './navigation';
import { Wordmark } from './Wordmark';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="surface-dark-raised">
      <StringsDivider />
      <Container className="grid gap-12 py-16 md:grid-cols-12">
        <div className="md:col-span-5">
          <Wordmark />
          <p className="mt-3 text-sm text-mist">Violinist and music educator, Kathmandu, Nepal</p>
          <Link
            to={BOOK_PATH}
            className="mt-6 inline-flex min-h-11 items-center text-sm text-varnish underline decoration-varnish/50 underline-offset-4 hover:decoration-varnish"
          >
            Enquire about a booking
          </Link>
        </div>

        <nav aria-label="Footer" className="md:col-span-7">
          <ul className="grid grid-cols-2 gap-x-8 sm:grid-cols-3">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="inline-flex min-h-11 items-center text-sm text-mist hover:text-ivory"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-xs text-mist md:col-span-12">
          © {year} Roman Budhathoki. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
