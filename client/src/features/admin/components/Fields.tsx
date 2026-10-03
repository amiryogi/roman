import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';

const control =
  'rounded-sm border bg-white px-3 py-2 text-stone-900 shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700';

interface FieldText {
  label: string;
  hint?: string;
  error?: string | undefined;
}

/** Label, hint and error wired to one control through aria-describedby (plan §18). */
function useFieldIds(id: string | undefined, { hint, error }: FieldText) {
  const generated = useId();
  const controlId = id ?? generated;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return { controlId, hintId, errorId, describedBy };
}

function Messages({
  hint,
  error,
  hintId,
  errorId,
}: FieldText & { hintId?: string; errorId?: string }) {
  return (
    <>
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
    </>
  );
}

export function TextAreaField({
  label,
  hint,
  error,
  id,
  className,
  ...props
}: FieldText & ComponentPropsWithRef<'textarea'>) {
  const ids = useFieldIds(id, { label, hint, error });
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={ids.controlId} className="text-sm font-medium text-stone-800">
        {label}
      </label>
      <textarea
        id={ids.controlId}
        rows={4}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={[control, error ? 'border-red-700' : 'border-stone-300', className].join(' ')}
        {...props}
      />
      <Messages hint={hint} error={error} label={label} hintId={ids.hintId} errorId={ids.errorId} />
    </div>
  );
}

export function SelectField({
  label,
  hint,
  error,
  id,
  children,
  ...props
}: FieldText & ComponentPropsWithRef<'select'> & { children: ReactNode }) {
  const ids = useFieldIds(id, { label, hint, error });
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={ids.controlId} className="text-sm font-medium text-stone-800">
        {label}
      </label>
      <select
        id={ids.controlId}
        aria-invalid={error ? true : undefined}
        aria-describedby={ids.describedBy}
        className={[control, error ? 'border-red-700' : 'border-stone-300'].join(' ')}
        {...props}
      >
        {children}
      </select>
      <Messages hint={hint} error={error} label={label} hintId={ids.hintId} errorId={ids.errorId} />
    </div>
  );
}

export function CheckboxField({
  label,
  hint,
  error,
  id,
  ...props
}: FieldText & Omit<ComponentPropsWithRef<'input'>, 'type'>) {
  const ids = useFieldIds(id, { label, hint, error });
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <input
          id={ids.controlId}
          type="checkbox"
          aria-describedby={ids.describedBy}
          className="size-5 accent-amber-700"
          {...props}
        />
        <label htmlFor={ids.controlId} className="text-sm font-medium text-stone-800">
          {label}
        </label>
      </div>
      <Messages hint={hint} error={error} label={label} hintId={ids.hintId} errorId={ids.errorId} />
    </div>
  );
}
