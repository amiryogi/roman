import { Link } from 'react-router';

import { SITE_NAME } from '@/components/seo/site';

interface WordmarkProps {
  onClick?: () => void;
  /** The violin mark before the name (header only). */
  withViolin?: boolean;
}

/** The name as a link home, set like the serif lockup in Roman's photographs. */
export function Wordmark({ onClick, withViolin = false }: WordmarkProps) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2.5 font-display text-[1.75rem] leading-none font-medium tracking-[0.06em] whitespace-nowrap"
    >
      {withViolin && (
        // Decorative: the link's name stays the text. Tilted slightly to the right, with the
        // photograph's dark edges faded into the header.
        <img
          src="/images/violin.png"
          alt=""
          width={63}
          height={168}
          decoding="async"
          className="h-11 w-auto shrink-0 rotate-12 [mask-image:radial-gradient(ellipse_at_center,black_55%,transparent_72%)] sm:h-14"
        />
      )}
      {SITE_NAME}
    </Link>
  );
}
