import type { ReactNode } from 'react';

/** The page's horizontal frame: full width on phones, a generous measure on large screens. */
export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={['mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12', className].join(' ')}>
      {children}
    </div>
  );
}
