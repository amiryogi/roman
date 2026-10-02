import type { ReactNode } from 'react';
import { Link } from 'react-router';

type Variant = 'solid' | 'outline';

const BASE =
  'inline-flex min-h-11 items-center justify-center rounded-sm px-6 text-sm font-medium tracking-[0.14em] uppercase transition-colors duration-200';

// Colours come from the surface (--accent, --on-accent), so a button reads right on both.
const VARIANTS: Record<Variant, string> = {
  solid: 'bg-(--accent) text-(--on-accent) hover:brightness-110',
  outline:
    'border border-current hover:bg-(--accent) hover:text-(--on-accent) hover:border-(--accent)',
};

interface ButtonLinkProps {
  to: string;
  variant?: Variant;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** A link styled as a button, for calls to action such as "Book Roman". */
export function ButtonLink({
  to,
  variant = 'solid',
  children,
  className,
  onClick,
}: ButtonLinkProps) {
  return (
    <Link to={to} onClick={onClick} className={[BASE, VARIANTS[variant], className].join(' ')}>
      {children}
    </Link>
  );
}
