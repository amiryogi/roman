import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { changePasswordFieldsSchema, newPasswordDiffers, PASSWORD_MIN_LENGTH } from '@roman/shared';

import { FormAlert } from '@/features/admin/components/FormAlert';
import { FormField } from '@/features/admin/components/FormField';
import { changePassword } from '@/lib/api/auth';
import { ApiClientError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';

// The confirmation field exists only in the browser; the server schema stays the source of truth.
const accountFormSchema = changePasswordFieldsSchema
  .extend({ confirmPassword: z.string().min(1, 'Confirm the new password') })
  .refine(newPasswordDiffers.check, newPasswordDiffers.params)
  .refine((value) => value.confirmPassword === value.newPassword, {
    path: ['confirmPassword'],
    error: 'The passwords do not match',
  });

export function AccountPage() {
  const [result, setResult] = useState<{ tone: 'error' | 'success'; message: string } | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(accountFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setResult(null);
    try {
      await changePassword({ currentPassword, newPassword });
      reset();
      setResult({
        tone: 'success',
        message: 'Password changed. Other devices have been signed out.',
      });
    } catch (error) {
      const wrongCurrent =
        error instanceof ApiClientError &&
        error.details.some((detail) => detail.path === 'currentPassword');
      if (wrongCurrent) {
        setError(
          'currentPassword',
          { message: 'This is not your current password' },
          { shouldFocus: true },
        );
        return;
      }
      setResult({ tone: 'error', message: getErrorMessage(error) });
    }
  });

  return (
    <section className="max-w-md">
      <title>Account · Admin · Roman Budhathoki</title>
      <h1 className="text-2xl font-semibold">Account</h1>
      <h2 className="mt-8 mb-4 text-lg font-semibold">Change password</h2>

      <form noValidate className="flex flex-col gap-4" onSubmit={(event) => void onSubmit(event)}>
        {result && <FormAlert tone={result.tone}>{result.message}</FormAlert>}
        <FormField
          label="Current password"
          type="password"
          autoComplete="current-password"
          error={errors.currentPassword?.message}
          {...register('currentPassword')}
        />
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          hint={`At least ${String(PASSWORD_MIN_LENGTH)} characters. A short phrase works well.`}
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <FormField
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 self-start rounded-sm bg-stone-900 px-4 py-2.5 font-medium text-white hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-60"
        >
          {isSubmitting ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </section>
  );
}
