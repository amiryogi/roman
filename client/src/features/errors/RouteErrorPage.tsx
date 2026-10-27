import { isRouteErrorResponse, useRouteError } from 'react-router';

import { NotFoundPage } from './NotFoundPage';

/**
 * Shown when a page fails to render or its code can't be loaded, e.g. an old tab after a new
 * deploy (plan §12.5, §22). It stands alone because the layout itself may be what failed.
 */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;

  return (
    <main className="flex min-h-dvh items-center surface-dark">
      <div className="mx-auto w-full max-w-3xl px-5 py-24 sm:px-8">
        <title>Something went wrong — Roman Budhathoki</title>
        <p className="eyebrow">Error</p>
        <h1 className="mt-4 page-title">Something went wrong</h1>
        <p className="mt-6 max-w-xl text-lg text-fog">
          The page couldn’t be displayed. Reloading usually fixes this.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            className="pill bg-crimson-deep text-snow hover:brightness-110"
          >
            Reload
          </button>
          <a href="/" className="pill btn-fill">
            Home
          </a>
        </div>
      </div>
    </main>
  );
}
