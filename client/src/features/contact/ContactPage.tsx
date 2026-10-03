import { useQuery } from '@tanstack/react-query';

import { Seo } from '@/components/seo/Seo';
import { Container } from '@/components/ui/Container';
import { getProfile, queryKeys } from '@/lib/api/public';
import { SOCIAL_PLATFORM_LABELS } from '@/lib/labels';

import { ContactForm } from './ContactForm';

/**
 * Contact and booking (plan §6): the form, the public contact details the owner chose to show
 * (the phone number only if allowed), social links, and a privacy note.
 */
export function ContactPage() {
  const profile = useQuery({ queryKey: queryKeys.profile, queryFn: getProfile });
  const contact = profile.data?.contact;
  const socials = profile.data?.socials ?? [];

  return (
    <div className="surface-light">
      <Seo
        title="Contact & Booking"
        path="/contact"
        description="Book Roman Budhathoki, violinist in Kathmandu, for weddings, concerts, events, studio recordings and violin lessons."
      />
      <Container className="grid gap-12 pt-16 pb-24 sm:pt-24 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <p className="label-caps text-(--accent)">Contact & booking</p>
          <h1 className="mt-4 font-display text-[3rem] leading-none font-medium sm:text-[4.5rem]">
            Contact
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-(--muted)">
            For weddings, concerts, private and corporate events, studio sessions or violin lessons,
            send the details with the form. The more you share about the date, the place and the
            music, the better.
          </p>

          {contact && (contact.publicEmail ?? contact.phone ?? contact.location) && (
            <dl className="mt-10 space-y-5 border-t border-current/15 pt-8">
              {contact.publicEmail && (
                <div>
                  <dt className="label-caps text-(--muted)">Email</dt>
                  <dd className="mt-1">
                    <a
                      href={`mailto:${contact.publicEmail}`}
                      className="text-lg text-(--accent) underline underline-offset-4"
                    >
                      {contact.publicEmail}
                    </a>
                  </dd>
                </div>
              )}
              {contact.phone && (
                <div>
                  <dt className="label-caps text-(--muted)">Phone</dt>
                  <dd className="mt-1">
                    <a
                      href={`tel:${contact.phone.replace(/[^\d+]/g, '')}`}
                      className="text-lg text-(--accent) underline underline-offset-4"
                    >
                      {contact.phone}
                    </a>
                  </dd>
                </div>
              )}
              {contact.location && (
                <div>
                  <dt className="label-caps text-(--muted)">Based in</dt>
                  <dd className="mt-1 text-lg">{contact.location}</dd>
                </div>
              )}
            </dl>
          )}

          {socials.length > 0 && (
            <div className="mt-8">
              <h2 className="label-caps text-(--muted)">Elsewhere</h2>
              <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                {socials.map((link) => (
                  <li key={link.url}>
                    <a
                      href={link.url}
                      rel="me noopener noreferrer"
                      className="text-lg text-(--accent) underline underline-offset-4"
                    >
                      {link.label ?? SOCIAL_PLATFORM_LABELS[link.platform]}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-10 text-sm leading-relaxed text-(--muted)">
            <strong className="font-medium text-ink">Privacy.</strong> The details you send are used
            only to reply to your enquiry. They aren’t shared, and they aren’t used for newsletters
            or marketing. Ask at any time to have your message deleted.
          </p>
        </div>

        <div className="lg:col-span-7">
          <ContactForm />
        </div>
      </Container>
    </div>
  );
}
