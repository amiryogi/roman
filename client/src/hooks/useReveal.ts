import { useEffect, useState } from 'react';

export type RevealState = 'hidden' | 'shown' | 'static';

/**
 * Fades an element up once when it first enters the viewport (plan §7.2). Returns a callback ref
 * and the value for `data-reveal`. The CSS animates only for people who haven't asked for reduced
 * motion, and without IntersectionObserver nothing is hidden.
 */
export function useReveal(): [(node: Element | null) => void, RevealState] {
  const [node, setNode] = useState<Element | null>(null);
  const [state, setState] = useState<RevealState>(() =>
    typeof IntersectionObserver === 'undefined' ? 'static' : 'hidden',
  );

  useEffect(() => {
    if (!node || state !== 'hidden') return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState('shown');
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -10% 0px' },
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [node, state]);

  return [setNode, state];
}
