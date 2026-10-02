import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';

/**
 * After client-side navigation, moves focus to the new page's <h1> (or <main>) and announces the
 * page title, as a full page load would (plan §12.1, §18). Skipped on the first load.
 */
export function RouteAnnouncer({ mainId }: { mainId: string }) {
  const { pathname } = useLocation();
  const [message, setMessage] = useState('');
  // Compared with the previous path rather than a "first render" flag, because StrictMode runs
  // effects twice and the second run would otherwise move focus on the initial load.
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    // Wait a frame so the new page (and its <title>) has rendered.
    const frame = requestAnimationFrame(() => {
      const main = document.getElementById(mainId);
      const heading = main?.querySelector<HTMLElement>('h1');
      const target = heading ?? main;
      if (target) {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
      setMessage(document.title);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [pathname, mainId]);

  return (
    <p aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}
