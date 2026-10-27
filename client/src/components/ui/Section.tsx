import type { ReactNode } from 'react';

import { useReveal } from '@/hooks/useReveal';

import { Container } from './Container';

export type SectionTone = 'dark' | 'dark-raised' | 'light';

// Every tone is dark since the 2026-10 revamp; they differ in depth, with faint crimson and blue
// light at the edges (`stage-light`). "light" is kept as a name for the raised surface.
const TONE_CLASS: Record<SectionTone, string> = {
  dark: 'surface-dark stage-light',
  'dark-raised': 'surface-dark-raised stage-light',
  light: 'surface-light',
};

interface SectionProps {
  tone: SectionTone;
  /** Crimson eyebrow, e.g. "About me". Also the heading unless `title` is given. */
  label: string;
  /** The h2, when it should differ from the label. */
  title?: string;
  /** Show only the label; the h2 stays for screen readers. */
  hideTitle?: boolean;
  /** A line under the heading. */
  intro?: ReactNode;
  id?: string;
  children: ReactNode;
}

/**
 * A page section: a crimson uppercase eyebrow over a Playfair heading, as on the reference design,
 * with generous vertical rhythm. Fades in as it enters the viewport.
 */
export function Section({
  tone,
  label,
  title,
  hideTitle = false,
  intro,
  id,
  children,
}: SectionProps) {
  // When the visible heading already says the label, there is no eyebrow.
  const eyebrow = hideTitle || title !== undefined ? label : undefined;
  const headingId = `${id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-title`;
  const [revealRef, revealState] = useReveal();

  return (
    <section id={id} aria-labelledby={headingId} className={TONE_CLASS[tone]}>
      <Container className="py-20 sm:py-24 lg:py-28">
        <div ref={revealRef} data-reveal={revealState}>
          {eyebrow && (
            <p className="eyebrow" aria-hidden="true">
              {eyebrow}
            </p>
          )}
          <h2
            id={headingId}
            className={
              hideTitle
                ? 'sr-only'
                : 'mt-4 font-display text-[2.25rem] leading-[1.1] sm:text-[3.25rem]'
            }
          >
            {title ?? label}
          </h2>
          {intro && (
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-(--muted)">{intro}</p>
          )}
          <div className="mt-10 sm:mt-12">{children}</div>
        </div>
      </Container>
    </section>
  );
}
