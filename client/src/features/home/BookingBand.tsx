import { BOOK_PATH } from '@/components/layout/navigation';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Section, type SectionTone } from '@/components/ui/Section';

/** The closing call to action on Home and About (plan §6). States no facts, only an invitation. */
export function BookingBand({ number, tone = 'dark' }: { number?: number; tone?: SectionTone }) {
  return (
    <Section tone={tone} label="Engagements" number={number} title="Book Roman">
      <div className="flex max-w-2xl flex-col items-start gap-8">
        <p className="text-lg leading-relaxed text-(--muted)">
          Weddings, concerts, private events, studio sessions and violin lessons. Share the date,
          the place and the music you have in mind.
        </p>
        <ButtonLink to={BOOK_PATH}>Send an enquiry</ButtonLink>
      </div>
    </Section>
  );
}
