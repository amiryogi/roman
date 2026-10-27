import { Link } from 'react-router';

import { SITE_NAME } from '@/components/seo/site';

interface WordmarkProps {
  onClick?: () => void;
  className?: string;
}

/**
 * The "ROMAN · violinist" logo as a link home (2026-10 revamp). The image's alt text gives the
 * link its name. A 1× and 2× WebP, trimmed from the owner's logo (public/images/logo-roman.png).
 */
export function Wordmark({ onClick, className }: WordmarkProps) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={['inline-flex min-h-11 shrink-0 items-center', className].join(' ')}
    >
      <img
        src="/images/logo-roman.webp"
        srcSet="/images/logo-roman.webp 1x, /images/logo-roman@2x.webp 2x"
        alt={SITE_NAME}
        width={186}
        height={48}
        decoding="async"
        className="h-9 w-auto sm:h-11"
      />
    </Link>
  );
}
