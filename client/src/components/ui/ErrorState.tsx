import { getErrorMessage } from '@/lib/api/errors';

interface ErrorStateProps {
  error: unknown;
  onRetry: () => void;
  title?: string;
}

/** A failed load, with a retry (plan §12.5). Announced to screen readers. */
export function ErrorState({
  error,
  onRetry,
  title = 'This page could not be loaded',
}: ErrorStateProps) {
  return (
    <div role="alert" className="flex max-w-xl flex-col items-start gap-4 py-16">
      <p className="font-display text-[2rem] leading-tight font-medium">{title}</p>
      <p className="text-(--muted)">{getErrorMessage(error)}</p>
      <button type="button" onClick={onRetry} className="pill btn-fill">
        Try again
      </button>
    </div>
  );
}
