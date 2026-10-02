import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from '@/app/App';

// Self-hosted variable fonts (plan §7.2). Each subset is a separate file selected by
// unicode-range, so English pages only download the Latin files.
import '@fontsource-variable/cormorant-garamond/wght.css';
import '@fontsource-variable/inter/wght.css';
import '@/styles/index.css';

// index.html carries head tags for crawlers that don't run JavaScript. From here on React renders
// each page's own tags (components/seo/Seo.tsx), so the static ones are removed to avoid duplicates.
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
