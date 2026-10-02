import '@testing-library/jest-dom/vitest';

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
