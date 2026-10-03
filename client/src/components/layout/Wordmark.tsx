import { Link } from 'react-router';

import { SITE_NAME } from '@/components/seo/site';

interface WordmarkProps {
  onClick?: () => void;
  /** The violin mark before the name (header and footer). */
  withViolin?: boolean;
}

/**
 * The name as a link home, set like the serif lockup in Roman's photographs. On load the violin
 * is lifted into place and the name is written in; on hover the violin sways like a bow stroke and
 * a varnish highlight glides across the name. All motion is skipped for reduced-motion users.
 */
export function Wordmark({ onClick, withViolin = false }: WordmarkProps) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="group inline-flex min-h-11 items-center gap-2.5 font-display text-[1.75rem] leading-none font-medium tracking-[0.06em] whitespace-nowrap"
    >
      {withViolin && (
        // The wrapper is lifted in once; the image itself rests tilted and sways on hover, so the
        // two animations never replace each other.
        <span aria-hidden="true" className="inline-flex shrink-0 motion-safe:animate-swing-in">
          <img
            src="/images/violin.png"
            alt=""
            width={63}
            height={168}
            decoding="async"
            className="h-11 w-auto rotate-12 [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_72%)] group-hover:motion-safe:animate-rock sm:h-14"
          />
        </span>
      )}
      {/* Written in once (outer); the hover highlight is a separate animation (inner). */}
      <span className="motion-safe:animate-write motion-safe:[animation-delay:200ms]">
        <span className="sheen-text">{SITE_NAME}</span>
      </span>
    </Link>
  );
}
