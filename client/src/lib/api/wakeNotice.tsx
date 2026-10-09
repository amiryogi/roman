import { createRoot, type Root } from 'react-dom/client';

import { ServerWakeNotice } from '@/components/layout/ServerWakeNotice';

let notice: { root: Root; host: HTMLElement } | undefined;

/**
 * Shows or hides the "tuning up" notice (wake.ts decides when). It has its own small React root,
 * so the layouts carry no code for it.
 */
export function showNotice(visible: boolean): void {
  if (visible && !notice) {
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);
    root.render(<ServerWakeNotice />);
    notice = { root, host };
  } else if (!visible && notice) {
    notice.root.unmount();
    notice.host.remove();
    notice = undefined;
  }
}
