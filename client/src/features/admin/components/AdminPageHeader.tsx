import type { ReactNode } from 'react';

export function AdminPageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <title>{`${title} · Admin · Roman Budhathoki`}</title>
      <h1 className="text-2xl font-semibold">{title}</h1>
      {action}
    </div>
  );
}
