import type { ProfileDto, SocialPlatform } from '@roman/shared';

import { SITE_NAME } from '@/components/seo/site';
import { SOCIAL_PLATFORM_LABELS } from '@/lib/labels';

type SocialLink = ProfileDto['socials'][number];

/** The icon utility for each platform (styles/index.css); platforms without one get a globe. */
const ICONS: Record<SocialPlatform, string> = {
  youtube: 'icon-youtube',
  facebook: 'icon-facebook',
  instagram: 'icon-instagram',
  tiktok: 'icon-link',
  spotify: 'icon-link',
  other: 'icon-link',
};

interface SocialLinksProps {
  links: readonly SocialLink[];
  /** Round icon buttons (footer) or icon plus name (Contact page). */
  variant?: 'icons' | 'labelled';
  className?: string;
}

/**
 * The social profiles the owner entered in the admin. They open in a new tab, so music playing on
 * the site keeps playing; the link's name says so.
 */
export function SocialLinks({ links, variant = 'icons', className }: SocialLinksProps) {
  if (links.length === 0) return null;
  return (
    <ul
      aria-label="Social media"
      className={[
        'flex flex-wrap',
        variant === 'icons' ? 'gap-3' : 'gap-x-6 gap-y-2',
        className,
      ].join(' ')}
    >
      {links.map((link) => {
        const name = link.label ?? SOCIAL_PLATFORM_LABELS[link.platform];
        const icon = <span aria-hidden="true" className={`icon ${ICONS[link.platform]}`} />;
        return (
          <li key={link.url}>
            {variant === 'icons' ? (
              <a
                href={link.url}
                target="_blank"
                rel="me noopener noreferrer"
                aria-label={`${SITE_NAME} on ${name} (opens in a new tab)`}
                title={name}
                className="inline-flex size-11 items-center justify-center rounded-full border border-current/20 text-mist transition-[color,border-color,translate] duration-300 hover:-translate-y-0.5 hover:border-varnish hover:text-varnish motion-reduce:transition-none"
              >
                {icon}
              </a>
            ) : (
              <a
                href={link.url}
                target="_blank"
                rel="me noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2.5 text-lg text-(--accent) underline underline-offset-4"
              >
                {icon}
                {name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}
