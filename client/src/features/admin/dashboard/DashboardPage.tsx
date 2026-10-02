import { useAuth } from '@/features/admin/auth/AuthContext';

// Phase 9 replaces this with content stats and recent inquiries.
export function DashboardPage() {
  const { state } = useAuth();
  const name = state.status === 'authenticated' ? state.admin.name : '';

  return (
    <section className="max-w-2xl">
      <title>Dashboard · Admin · Roman Budhathoki</title>
      <h1 className="text-2xl font-semibold">Welcome, {name}</h1>
      <p className="mt-2 text-stone-600">
        Content management for music, videos, the gallery, events and inquiries will appear here as
        each section is built.
      </p>
    </section>
  );
}
