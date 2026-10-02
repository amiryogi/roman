import { Link } from 'react-router';

export function AdminNotFoundPage() {
  return (
    <section className="max-w-2xl">
      <title>Not found · Admin · Roman Budhathoki</title>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 text-stone-600">This admin page doesn’t exist.</p>
      <Link to="/admin" className="mt-4 inline-block underline underline-offset-4">
        Back to the dashboard
      </Link>
    </section>
  );
}
