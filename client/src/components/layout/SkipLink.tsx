/** The first focusable element on every page (plan §18). */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-sm surface-light px-4 py-3 text-sm font-medium focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      Skip to main content
    </a>
  );
}
