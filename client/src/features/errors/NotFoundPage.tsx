import { Seo } from '@/components/seo/Seo';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Container } from '@/components/ui/Container';

/** Branded 404 inside the public layout (plan §6). */
export function NotFoundPage() {
  return (
    <div className="surface-dark">
      <Seo title="Page not found" path="/404" noindex />
      <Container className="py-24 sm:py-32">
        <p className="label-caps text-varnish">404</p>
        <h1 className="mt-4 font-display text-[3rem] leading-none font-medium sm:text-[4.5rem]">
          Page not found
        </h1>
        <p className="mt-6 max-w-xl text-lg text-mist">This page doesn’t exist, or it has moved.</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink to="/">Home</ButtonLink>
          <ButtonLink to="/music" variant="outline">
            Listen to the music
          </ButtonLink>
        </div>
      </Container>
    </div>
  );
}
