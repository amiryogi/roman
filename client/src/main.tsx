// First: configures Zod before any lazily loaded chunk defines a schema.
import '@/lib/zodSetup';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';

// Self-hosted variable fonts (plan §7.2). Each subset is a separate file selected by
// unicode-range, so English pages only download the Latin files.
import '@fontsource-variable/cormorant-garamond/wght.css';
import '@fontsource-variable/inter/wght.css';
import '@/styles/index.css';

// The prerendered HTML (scripts/postbuild-seo.ts) carries head tags and structured data for crawlers
// and link previews that don't run JavaScript. From here on React renders each page's own tags from
// live data (components/seo/Seo.tsx, JsonLd.tsx), so the prerendered ones are removed first.
for (const element of document.head.querySelectorAll('[data-prerender]')) {
  element.remove();
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
