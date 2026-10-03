import type { ReactNode } from 'react';
import { Link } from 'react-router';

type Variant = 'solid' | 'outline';

const BASE =
  'relative isolate inline-flex min-h-11 items-center justify-center overflow-hidden rounded-sm px-6 text-sm font-medium tracking-[0.14em] uppercase transition-[color,border-color,background-size,filter] duration-300';

// Colours come from the surface (--accent, --on-accent), so a button reads right on both.
// Solid: a soft light sweeps across on hover (`btn-sheen`). Outline: the accent fills in from the
// left, like a bow stroke (`btn-fill`). Both are defined in styles/index.css.
const VARIANTS: Record<Variant, string> = {
  solid: 'bg-(--accent) text-(--on-accent) btn-sheen hover:brightness-110',
  outline: 'btn-fill',
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
