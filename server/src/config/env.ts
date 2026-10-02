import { z } from 'zod';

// Variables are added phase by phase (plan §21.2): auth secrets in Phase 3, Cloudinary in Phase 4.
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
    MONGODB_URI: z
      .string({ error: 'MONGODB_URI is required' })
      .regex(/^mongodb(?:\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
    CLIENT_ORIGINS: z.string().optional(),
    TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    APP_VERSION: z.string().optional(),
    // Set automatically by Render.
    RENDER_GIT_COMMIT: z.string().optional(),
  })
  .transform((raw, ctx) => {
    const clientOrigins = (raw.CLIENT_ORIGINS ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== '');

    if (clientOrigins.length === 0) {
      if (raw.NODE_ENV === 'production') {
        ctx.addIssue({
          code: 'custom',
          path: ['CLIENT_ORIGINS'],
          message: 'is required in production',
        });
        return z.NEVER;
      }
      clientOrigins.push('http://localhost:5173');
    }

    for (const origin of clientOrigins) {
      if (!z.url().safeParse(origin).success) {
        ctx.addIssue({
          code: 'custom',
          path: ['CLIENT_ORIGINS'],
          message: `"${origin}" is not a valid origin`,
        });
        return z.NEVER;
      }
    }

    return {
      nodeEnv: raw.NODE_ENV,
      isProduction: raw.NODE_ENV === 'production',
      port: raw.PORT,
      mongodbUri: raw.MONGODB_URI,
      clientOrigins,
      trustProxy: raw.TRUST_PROXY,
      logLevel: raw.LOG_LEVEL,
      version: raw.APP_VERSION ?? raw.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'dev',
    };
  });

export type Env = z.output<typeof envSchema>;

export class EnvError extends Error {
  override readonly name = 'EnvError';
}

/** Parses and validates configuration. Throws EnvError listing every problem. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvError(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
