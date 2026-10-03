import '@testing-library/jest-dom/vitest';

import { configure } from '@testing-library/react';

// findBy*/waitFor give up after 1 s by default. The first render of a lazily loaded page can take
// longer while the full suite runs in parallel (or on a slow CI machine), so allow 3 s.
configure({ asyncUtilTimeout: 3000 });

// jsdom has <dialog> but not its modal methods. A minimal stand-in: open/close, the `close`
// event, and Esc (the browser's `cancel` behaviour). Focus trapping is the browser's job.
if (!('showModal' in HTMLDialogElement.prototype)) {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      value(this: HTMLDialogElement) {
        this.setAttribute('open', '');
        this.addEventListener('keydown', closeOnEscape);
      },
    },
    close: {
      value(this: HTMLDialogElement) {
        if (!this.hasAttribute('open')) return;
        this.removeAttribute('open');
        this.removeEventListener('keydown', closeOnEscape);
        this.dispatchEvent(new Event('close'));
      },
    },
  });
}

function closeOnEscape(this: HTMLDialogElement, event: KeyboardEvent) {
  if (event.key === 'Escape') this.close();
}

// jsdom logs "Not implemented" for scrolling, which React Router's ScrollRestoration calls.
Object.defineProperty(window, 'scrollTo', { value: () => undefined, writable: true });

// The app loads response validation lazily (lib/api/client.ts). Loading it once here keeps that
// first dynamic import, which transforms Zod and every schema, out of each test's waiting time.
await import('@/lib/api/validation');
