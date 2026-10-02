import type { ReactNode } from 'react';

import { useReveal } from '@/hooks/useReveal';
import { toRoman } from '@/lib/format';

import { Container } from './Container';

export type SectionTone = 'dark' | 'dark-raised' | 'light';

const TONE_CLASS: Record<SectionTone, string> = {
  dark: 'surface-dark',
  'dark-raised': 'surface-dark-raised',
  light: 'surface-light',
};

interface SectionProps {
  tone: SectionTone;
  /** Small-caps label, e.g. "Biography". Also the heading unless `title` is given. */
  label: string;
  /** Movement number shown before the label: "II. — Biography". */
  number?: number;
  /** The h2, when it should differ from the label. */
  title?: string;
  /** Show only the label; the h2 stays for screen readers. */
  hideTitle?: boolean;
  id?: string;
  children: ReactNode;
}

/**
 * A page section on a "stage" (dark) or "paper" (light) surface, with a movement-style label
 * (plan §7.1) and generous vertical rhythm. Fades in as it enters the viewport.
 */
export function Section({
  tone,
  label,
  number,
  title,
  hideTitle = false,
  id,
  children,
}: SectionProps) {
  const numeral = number === undefined ? undefined : `${toRoman(number)}.`;
  const fullLabel = numeral ? `${numeral} — ${label}` : label;
  // When the visible heading already says the label, the eyebrow shows only the number.
  const eyebrow = hideTitle || title !== undefined ? fullLabel : numeral;
  const headingId = `${id ?? label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-title`;
  const [revealRef, revealState] = useReveal();

  return (
    <section id={id} aria-labelledby={headingId} className={TONE_CLASS[tone]}>
      <Container className="py-20 sm:py-24 lg:py-32">
        <div ref={revealRef} data-reveal={revealState}>
          {eyebrow && (
            <p className="label-caps text-(--accent)" aria-hidden="true">
              {eyebrow}
            </p>
          )}
          <h2
            id={headingId}
            className={
              hideTitle
                ? 'sr-only'
                : 'mt-4 font-display text-[2.25rem] leading-[1.1] font-medium sm:text-[2.75rem]'
            }
          >
            {title ?? label}
          </h2>
          <div className="mt-10 sm:mt-12">{children}</div>
        </div>
      </Container>
    </section>
  );
}
