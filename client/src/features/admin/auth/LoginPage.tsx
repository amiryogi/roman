import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate, useSearchParams } from 'react-router';

import { loginInputSchema } from '@roman/shared';

import { FormAlert } from '@/features/admin/components/FormAlert';
import { FormField } from '@/features/admin/components/FormField';
import { getErrorMessage } from '@/lib/api/errors';

import { useAuth } from './AuthContext';
import { safeNextPath } from './safeNextPath';

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  if (state.status === 'authenticated') return <Navigate to={next} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      await navigate(next, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 py-12">
      <title>Sign in · Admin · Roman Budhathoki</title>
      <div className="w-full max-w-sm rounded-sm border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-xs tracking-[0.3em] text-stone-500 uppercase">Roman Budhathoki</p>
        <h1 className="mt-1 mb-6 text-2xl font-semibold text-stone-900">Admin sign in</h1>

        <form noValidate className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
          {formError && <FormAlert tone="error">{formError}</FormAlert>}
          <FormField
            label="Email"
            type="email"
            autoComplete="username"
            error={errors.email?.message}
            {...register('email')}
          />
          <FormField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <button
            type="submit"
            disabled={isSubmitting || state.status === 'loading'}
            className="mt-2 rounded-sm bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-60"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
