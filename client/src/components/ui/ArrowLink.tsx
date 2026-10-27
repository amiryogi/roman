import type { ReactNode } from 'react';
import { Link } from 'react-router';

interface ArrowLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
}

/**
 * A "more" link ("All videos →"): the text, and an arrow in a light circle that steps forward on
 * hover. The arrow is decorative, so the link's name is just its text.
 */
export function ArrowLink({ to, children, className }: ArrowLinkProps) {
  return (
    <Link
      to={to}
      className={['group inline-flex min-h-11 items-center gap-3 font-semibold', className].join(
        ' ',
      )}
    >
      <span className="underline decoration-transparent underline-offset-[6px] transition-[text-decoration-color] group-hover:decoration-current">
        {children}
      </span>
      <span
        aria-hidden="true"
        className="grid size-8 place-items-center rounded-full bg-snow text-night transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none"
      >
        →
      </span>
    </Link>
  );
}
