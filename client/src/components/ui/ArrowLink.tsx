import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface ArrowLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
}

/**
 * A quiet "more" link ("All videos →"): small capitals, an underline that warms on hover and an
 * arrow that steps forward. The arrow is decorative, so the link's name is just its text.
 */
export function ArrowLink({ to, children, className }: ArrowLinkProps) {
  return (
    <Link
      to={to}
      className={[
        'group inline-flex min-h-11 items-center gap-3 text-sm font-medium tracking-[0.14em] text-(--accent) uppercase',
        className,
      ].join(' ')}
    >
      <span className="underline decoration-current/40 underline-offset-[6px] transition-[text-decoration-color] group-hover:decoration-current">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="transition-transform duration-300 group-hover:translate-x-1.5 motion-reduce:transition-none"
      >
        →
      </span>
    </Link>
  );
}
