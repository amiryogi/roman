/** A placeholder block shaped like the content it stands for, so nothing shifts on load. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={[
        'animate-pulse rounded-sm bg-current opacity-10 motion-reduce:animate-none',
        className,
      ].join(' ')}
    />
  );
}
