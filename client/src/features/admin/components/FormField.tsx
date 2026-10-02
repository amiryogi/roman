import { useId, type ComponentPropsWithRef } from 'react';

interface FormFieldProps extends ComponentPropsWithRef<'input'> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

/** Labelled input with its hint and error wired up for assistive technology (plan §18). */
export function FormField({ label, error, hint, id, className, ...inputProps }: FormFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-stone-800">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={[
          'rounded-sm border bg-white px-3 py-2 text-stone-900 shadow-xs',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700',
          error ? 'border-red-700' : 'border-stone-300',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...inputProps}
      />
      {hint && (
        <p id={hintId} className="text-sm text-stone-600">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
