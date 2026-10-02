import { Link } from 'react-router';

import { SITE_NAME } from '@/components/seo/site';

/** The name as a link home, set like the serif lockup in Roman's photographs. */
export function Wordmark({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="inline-flex min-h-11 items-center font-display text-[1.75rem] leading-none font-medium tracking-[0.06em] whitespace-nowrap"
    >
      {SITE_NAME}
    </Link>
  );
}
