import type { $ZodConfig } from 'zod/v4/core';

declare global {
  // Zod's shared configuration object (see lib/zodSetup.ts).
  var __zod_globalConfig: $ZodConfig | undefined;
}

export {};
