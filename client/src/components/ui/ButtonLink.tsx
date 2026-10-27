import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { buttonClass, type ButtonVariant } from './buttonClass';

interface ButtonLinkProps {
  to: string;
  variant?: ButtonVariant;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** A link styled as a button, for calls to action such as "Book me". */
export function ButtonLink({
  to,
  variant = 'solid',
  children,
  className,
  onClick,
}: ButtonLinkProps) {
  return (
    <Link to={to} onClick={onClick} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
