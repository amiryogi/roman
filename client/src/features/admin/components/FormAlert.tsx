interface FormAlertProps {
  tone: 'error' | 'success';
  children: string;
}

/** Form-level message. Errors are announced immediately; success politely. */
export function FormAlert({ tone, children }: FormAlertProps) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={[
        'rounded-sm border px-3 py-2 text-sm',
        tone === 'error'
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-emerald-200 bg-emerald-50 text-emerald-900',
      ].join(' ')}
    >
      {children}
    </p>
  );
}
