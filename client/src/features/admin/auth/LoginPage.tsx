import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router';

import { loginInputSchema } from '@roman/shared';

import { FormAlert } from '@/features/admin/components/FormAlert';
import { FormField } from '@/features/admin/components/FormField';
import { getErrorMessage } from '@/lib/api/errors';

import { useAuth } from './AuthContext';
import { safeNextPath } from './safeNextPath';

/** The violin's strings, lowest to highest: thicker strings are drawn heavier. */
const STRINGS = [
  { note: 'G', thickness: 'h-[2px]' },
  { note: 'D', thickness: 'h-[1.5px]' },
  { note: 'A', thickness: 'h-[1.25px]' },
  { note: 'E', thickness: 'h-px' },
] as const;

/** Long enough to see (and hear, in the mind's ear) the final chord before the dashboard opens. */
const CHORD_MS = 350;

function prefersReducedMotion(): boolean {
  // `matchMedia` is missing in some environments (e.g. jsdom): skip the pause there too.
  return (
    typeof window.matchMedia !== 'function' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Admin sign-in, staged as the moment before a performance: the violin rests in a breathing
 * spotlight, and the four strings above the form answer every key (decorative only).
 */
export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get('next'));
  const [formError, setFormError] = useState<string | null>(null);
  // How often each string has been plucked: a new count restarts its vibration.
  const [plucks, setPlucks] = useState<readonly number[]>([0, 0, 0, 0]);
  const [keystrokes, setKeystrokes] = useState(0);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginInputSchema),
    defaultValues: { email: '', password: '' },
  });

  if (state.status === 'authenticated') return <Navigate to={next} replace />;

  /** Each change to a field plucks the next string in turn: they reveal nothing of what is typed. */
  function pluckNext() {
    const string = keystrokes % STRINGS.length;
    setKeystrokes((count) => count + 1);
    setPlucks((counts) => counts.map((count, index) => (index === string ? count + 1 : count)));
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values);
      // A full chord on the way in.
      setPlucks((counts) => counts.map((count) => count + 1));
      if (!prefersReducedMotion()) {
        await new Promise((resolve) => setTimeout(resolve, CHORD_MS));
      }
      await navigate(next, { replace: true });
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  });

  return (
    <main className="relative isolate flex min-h-dvh items-center justify-center overflow-hidden surface-dark px-4 py-12">
      <title>Sign in · Admin · Roman Budhathoki</title>

      {/* The spotlight, slowly breathing. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[12rem] left-1/2 -z-10 size-[min(140vh,140vw)] -translate-x-1/2 -translate-y-1/2 sm:top-[14rem] lg:top-1/2 lg:left-[35%]"
      >
        <div className="size-full animate-breathe rounded-full bg-[radial-gradient(circle_at_center,rgb(192_122_53/0.32),rgb(138_75_28/0.12)_35%,transparent_62%)] motion-reduce:animate-none" />
      </div>

      <div className="grid w-full max-w-5xl items-center justify-items-center gap-8 lg:grid-cols-[1fr_minmax(0,26rem)] lg:gap-16">
        <img
          src="/images/violin-stage.webp"
          alt=""
          width={375}
          height={720}
          decoding="async"
          className="h-40 w-auto animate-sway [mask-image:radial-gradient(ellipse_at_center,black_48%,transparent_70%)] motion-reduce:rotate-[11deg] motion-reduce:animate-none sm:h-52 lg:h-[min(72vh,640px)]"
        />

        <div className="w-full max-w-sm animate-rise rounded-sm surface-light p-8 shadow-2xl ring-1 shadow-black/50 ring-varnish/25 motion-reduce:animate-none">
          <p className="label-caps text-(--accent)">Backstage</p>
          <h1 className="mt-2 font-display text-[2.5rem] leading-none font-medium">
            Admin sign in
          </h1>
          <p className="mt-3 text-sm text-(--muted)">Tune up, then take the stage.</p>

          <div aria-hidden="true" className="my-6 flex flex-col gap-2.5">
            {STRINGS.map((string, index) => {
              const count = plucks[index] ?? 0;
              return (
                <div key={string.note} className="flex items-center gap-3">
                  <span className="w-3 label-caps text-(--muted)">{string.note}</span>
                  <div
                    // A new key restarts the vibration on every pluck.
                    key={count}
                    className={[
                      'flex-1 rounded-full bg-gradient-to-r from-varnish-deep via-varnish to-varnish-deep',
                      string.thickness,
                      count > 0 ? 'animate-pluck motion-reduce:animate-none' : '',
                    ].join(' ')}
                  />
                </div>
              );
            })}
          </div>

          <form
            noValidate
            className="flex flex-col gap-4"
            onSubmit={(event) => void onSubmit(event)}
          >
            {formError && <FormAlert tone="error">{formError}</FormAlert>}
            <FormField
              label="Email"
              type="email"
              autoComplete="username"
              onInput={pluckNext}
              error={errors.email?.message}
              {...register('email')}
            />
            <FormField
              label="Password"
              type="password"
              autoComplete="current-password"
              onInput={pluckNext}
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="submit"
              disabled={isSubmitting || state.status === 'loading'}
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-sm bg-ink px-4 font-medium text-ivory transition-colors hover:bg-varnish-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--focus-ring) disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm">
            <Link
              to="/"
              className="text-(--muted) underline-offset-4 hover:text-(--accent) hover:underline"
            >
              ← Back to the site
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
