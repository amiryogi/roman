import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { Container } from '@/components/ui/Container';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { StringsDivider } from '@/components/ui/StringsDivider';
import { getProfile, queryKeys } from '@/lib/api/public';

import { BOOK_PATH, NAV_ITEMS } from './navigation';
import { Wordmark } from './Wordmark';

const contactLink =
  'group inline-flex min-h-11 items-center gap-3 text-sm text-ivory transition-colors hover:text-varnish';

/**
 * Site footer. Contact details and social links come from the profile the owner edits in the
 * admin (the phone number only when they chose to show it), so they are never hard-coded here.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  // Shared with the About and Contact pages, so it is usually already cached.
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });
  const contact = profile.data?.contact;
  const socials = profile.data?.socials ?? [];

  return (
    <footer className="surface-dark-raised stage-light">
      <StringsDivider />
      <Container className="grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Wordmark withViolin />
          <p className="mt-3 text-sm text-mist">Violinist and music educator, Kathmandu, Nepal</p>
          <Link
            to={BOOK_PATH}
            className="mt-6 inline-flex min-h-11 items-center text-sm text-varnish underline decoration-varnish/50 underline-offset-4 hover:decoration-varnish"
          >
            Enquire about a booking
          </Link>
        </div>

        {(contact?.publicEmail ?? contact?.phone) !== undefined && (
          <div className="lg:col-span-3">
            <h2 className="label-caps text-mist">Get in touch</h2>
            <ul className="mt-3 flex flex-col">
              {contact?.publicEmail && (
                <li>
                  <a href={`mailto:${contact.publicEmail}`} className={contactLink}>
                    <span aria-hidden="true" className="icon text-varnish icon-mail" />
                    <span className="break-all">{contact.publicEmail}</span>
                  </a>
                </li>
              )}
              {contact?.phone && (
                <li>
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className={contactLink}>
                    <span aria-hidden="true" className="icon text-varnish icon-phone" />
                    {contact.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}

        {socials.length > 0 && (
          <div className="lg:col-span-2">
            <h2 className="label-caps text-mist">Follow</h2>
            <SocialLinks links={socials} className="mt-4" />
          </div>
        )}

        <nav aria-label="Footer" className="lg:col-span-3">
          <ul className="grid grid-cols-2 gap-x-8">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="inline-flex min-h-11 items-center text-sm text-mist transition-[color,translate] duration-300 hover:translate-x-1 hover:text-ivory motion-reduce:transition-none"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <p className="text-xs text-mist md:col-span-2 lg:col-span-12">
          © {year} Roman Budhathoki. All rights reserved.
        </p>
      </Container>
    </footer>
  );
}
