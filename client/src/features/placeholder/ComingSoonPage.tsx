import { Seo } from '@/components/seo/Seo';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';

/**
 * TEMPORARY: stands in for sections built in later phases (Music: 6, Videos and Gallery: 7,
 * Performances and Contact: 8), so the navigation can be reviewed. Not indexed by search engines.
 */
export function ComingSoonPage({ title, path }: { title: string; path: string }) {
  return (
    <div className="surface-light">
      <Seo title={title} path={path} noindex />
      <Container className="py-24 sm:py-32">
        <p className="label-caps text-(--accent)">In preparation</p>
        <h1 className="mt-4 font-display text-[3rem] leading-none font-medium sm:text-[4.5rem]">
          {title}
        </h1>
        <p className="mt-6 max-w-xl text-lg text-(--muted)">This section is being prepared.</p>
        <ButtonLink to="/" variant="outline" className="mt-10">
          Back to the home page
        </ButtonLink>
      </Container>
    </div>
  );
}
