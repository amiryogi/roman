export function PageSpinner({ label }: { label: string }) {
  return (
    <div
      role="status"
      className="flex min-h-[50vh] items-center justify-center gap-3 text-stone-600"
    >
      <span
        aria-hidden="true"
        className="size-5 animate-spin rounded-full border-2 border-stone-300 border-t-stone-700 motion-reduce:animate-none"
      />
      <span>{label}</span>
    </div>
  );
}
