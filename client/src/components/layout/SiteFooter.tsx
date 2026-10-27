import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { SITE_NAME } from '@/components/seo/site';
import { Container } from '@/components/ui/Container';
import { SocialLinks } from '@/components/ui/SocialLinks';
import { getProfile, queryKeys } from '@/lib/api/public';

import { NAV_ITEMS } from './navigation';

const contactLink =
  'group inline-flex min-h-11 items-center gap-3 text-snow transition-colors hover:text-crimson';

/** From the CV, until the profile has loaded (and if it has no tagline). */
const FALLBACK_TAGLINE = 'Violinist and music educator, Kathmandu, Nepal';

/**
 * Site footer, laid out as on the reference design: name and introduction with social buttons,
 * the site's pages, and how to get in touch. Contact details and social links come from the
 * profile the owner edits in the admin (the phone number only when they chose to show it).
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  // Shared with the About and Contact pages, so it is usually already cached.
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });
  const contact = profile.data?.contact;
  const socials = profile.data?.socials ?? [];
  const tagline = profile.data?.tagline ?? FALLBACK_TAGLINE;
  const hasContact = Boolean(contact?.publicEmail ?? contact?.phone ?? contact?.location);

  return (
    <footer className="surface-dark stage-light">
      <Container className="grid gap-12 border-t border-snow/10 py-16 md:grid-cols-2 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="font-display text-[1.75rem] leading-tight">{SITE_NAME}</p>
          <p className="mt-3 max-w-sm text-fog">{tagline}</p>
          <SocialLinks links={socials} className="mt-6" />
        </div>

        <nav aria-label="Footer" className="lg:col-span-4">
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase">Explore</h2>
          <ul className="mt-3 grid grid-cols-2 gap-x-8">
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="inline-flex min-h-11 items-center text-fog transition-[color,translate] duration-300 hover:translate-x-1 hover:text-snow motion-reduce:transition-none"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {hasContact && (
          <div className="lg:col-span-3">
            <h2 className="text-sm font-semibold tracking-[0.2em] uppercase">Get in touch</h2>
            <ul className="mt-3 flex flex-col">
              {contact?.location && (
                <li className="inline-flex min-h-11 items-center text-fog">{contact.location}</li>
              )}
              {contact?.publicEmail && (
                <li>
                  <a href={`mailto:${contact.publicEmail}`} className={contactLink}>
                    <span aria-hidden="true" className="icon text-crimson icon-mail" />
                    <span className="break-all">{contact.publicEmail}</span>
                  </a>
                </li>
              )}
              {contact?.phone && (
                <li>
                  <a href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`} className={contactLink}>
                    <span aria-hidden="true" className="icon text-crimson icon-phone" />
                    {contact.phone}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}

        <p className="border-t border-snow/10 pt-6 text-sm text-fog md:col-span-2 lg:col-span-12">
          © {year} {SITE_NAME} · {tagline}
        </p>
      </Container>
    </footer>
  );
}
