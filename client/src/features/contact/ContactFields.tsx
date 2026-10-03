import type { ComponentPropsWithRef, ReactNode } from 'react';

// Form controls for the public site's paper surface: visible labels, hints and errors wired to the
// control with aria-describedby (plan §18).

interface FieldProps {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  error?: string | undefined;
}

const control =
  'w-full rounded-sm border bg-white px-3 py-2.5 text-ink shadow-xs placeholder:text-ink-muted/70';

function describedBy({ id, hint, error }: FieldProps): string | undefined {
  return (
    [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined
  );
}

function Frame({
  id,
  label,
  required,
  hint,
  error,
  children,
}: FieldProps & { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
        {required ? (
          <span className="font-normal text-ink-muted"> (required)</span>
        ) : (
          <span className="font-normal text-ink-muted"> (optional)</span>
        )}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function InputField({
  id,
  label,
  required,
  hint,
  error,
  ...props
}: FieldProps & ComponentPropsWithRef<'input'>) {
  return (
    <Frame id={id} label={label} required={required} hint={hint} error={error}>
      <input
        id={id}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        className={`${control} ${error ? 'border-danger' : 'border-ink/25'}`}
        {...props}
      />
    </Frame>
  );
}

export function TextareaField({
  id,
  label,
  required,
  hint,
  error,
  ...props
}: FieldProps & ComponentPropsWithRef<'textarea'>) {
  return (
    <Frame id={id} label={label} required={required} hint={hint} error={error}>
      <textarea
        id={id}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        className={`${control} ${error ? 'border-danger' : 'border-ink/25'}`}
        {...props}
      />
    </Frame>
  );
}

export function SelectField({
  id,
  label,
  required,
  hint,
  error,
  children,
  ...props
}: FieldProps & ComponentPropsWithRef<'select'>) {
  return (
    <Frame id={id} label={label} required={required} hint={hint} error={error}>
      <select
        id={id}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy({ id, label, hint, error })}
        className={`${control} ${error ? 'border-danger' : 'border-ink/25'}`}
        {...props}
      >
        {children}
      </select>
    </Frame>
  );
}
