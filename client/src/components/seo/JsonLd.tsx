import { jsonLdDocument, serializeJsonLd, type JsonLdObject } from './structuredData';

/**
 * Structured data for the current page, from live API data (plan §17). The build-time copy in the
 * prerendered HTML is removed at startup (see main.tsx), so the two never duplicate. A data block
 * is never executed, so the script CSP doesn't apply to it.
 */
export function JsonLd({ items }: { items: JsonLdObject[] }) {
  if (items.length === 0) return null;
  return <script type="application/ld+json">{serializeJsonLd(jsonLdDocument(items))}</script>;
}
