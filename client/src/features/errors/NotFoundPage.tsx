import { Link } from 'react-router';

// Phase 5 restyles this with the site's design system.
export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <title>Page not found · Roman Budhathoki</title>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="text-stone-600">The page you were looking for doesn’t exist.</p>
      <Link to="/" className="underline underline-offset-4">
        Go to the home page
      </Link>
    </main>
  );
}
