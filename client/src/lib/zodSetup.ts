// Zod normally probes `new Function` to compile faster validators. The site's CSP forbids eval
// (script-src 'self'), and although Zod catches the failure, the browser still reports a CSP
// violation. Zod reads its configuration from `globalThis.__zod_globalConfig` (shared by every copy
// of Zod), and decides when each schema is *defined*, so the flag is set here, in the entry, before
// any chunk containing Zod or the schemas loads. No Zod import: Zod itself stays out of the entry.
globalThis.__zod_globalConfig = { ...globalThis.__zod_globalConfig, jitless: true };
