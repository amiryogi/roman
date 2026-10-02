import { z } from 'zod';

const MEGABYTE = 1024 * 1024;

const megabytes = (fallback: number) => z.coerce.number().int().min(1).max(2048).default(fallback);

/** e.g. "roman-budhathoki/production": lower-case path segments, no leading or trailing slash. */
const ROOT_FOLDER_PATTERN = /^[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/;

// Variables are added phase by phase (plan §21.2).
const rawEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  MONGODB_URI: z
    .string({ error: 'MONGODB_URI is required' })
    .regex(/^mongodb(?:\+srv)?:\/\//, 'must start with mongodb:// or mongodb+srv://'),
  CLIENT_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  JWT_ACCESS_SECRET: z
    .string({ error: 'JWT_ACCESS_SECRET is required' })
    .min(32, 'must be at least 32 characters (use 32+ random bytes, base64)')
    .refine(
      (value) => !value.startsWith('replace-with'),
      'replace the example value from .env.example',
    ),
  JWT_ISSUER: z.string().min(1).default('roman-budhathoki-api'),
  JWT_AUDIENCE: z.string().min(1).default('roman-budhathoki-admin'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  // --- Media (plan §9, §21.2) ---
  MEDIA_DRIVER: z.enum(['cloudinary', 'fake']).default('cloudinary'),
  CLOUDINARY_CLOUD_NAME: z.string().trim().optional(),
  CLOUDINARY_API_KEY: z.string().trim().optional(),
  CLOUDINARY_API_SECRET: z.string().trim().optional(),
  CLOUDINARY_ROOT_FOLDER: z
    .string()
    .trim()
    .regex(ROOT_FOLDER_PATTERN, 'must look like "roman-budhathoki/development"')
    .optional(),
  // "auto" asks Cloudinary once; set it explicitly to skip that request.
  CLOUDINARY_FOLDER_MODE: z.enum(['auto', 'dynamic', 'fixed']).default('auto'),
  MEDIA_MAX_IMAGE_MB: megabytes(20),
  MEDIA_MAX_AUDIO_MB: megabytes(100),
  MEDIA_MAX_VIDEO_MB: megabytes(100),
  APP_VERSION: z.string().optional(),
  // Set automatically by Render.
  RENDER_GIT_COMMIT: z.string().optional(),
});

type RawEnv = z.output<typeof rawEnvSchema>;
type ReportIssue = (path: string, message: string) => void;

const envSchema = rawEnvSchema.transform((raw, ctx) => {
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

  const media = parseMedia(raw, (path, message) => {
    ctx.addIssue({ code: 'custom', path: [path], message });
  });
  if (!media) return z.NEVER;

  return {
    nodeEnv: raw.NODE_ENV,
    isProduction: raw.NODE_ENV === 'production',
    port: raw.PORT,
    mongodbUri: raw.MONGODB_URI,
    clientOrigins,
    trustProxy: raw.TRUST_PROXY,
    logLevel: raw.LOG_LEVEL,
    auth: {
      accessSecret: raw.JWT_ACCESS_SECRET,
      issuer: raw.JWT_ISSUER,
      audience: raw.JWT_AUDIENCE,
      accessTtlSeconds: raw.ACCESS_TOKEN_TTL_SECONDS,
      refreshTtlDays: raw.REFRESH_TOKEN_TTL_DAYS,
      // Browsers treat http://localhost as secure, but test clients and plain-http dev do not.
      secureCookies: raw.NODE_ENV === 'production',
    },
    media,
    version: raw.APP_VERSION ?? raw.RENDER_GIT_COMMIT?.slice(0, 7) ?? 'dev',
  };
});

/** Media settings (plan §9, §21.2). Returns undefined after reporting problems. */
function parseMedia(raw: RawEnv, issue: ReportIssue) {
  const isProduction = raw.NODE_ENV === 'production';

  if (isProduction && raw.MEDIA_DRIVER === 'fake') {
    issue('MEDIA_DRIVER', '"fake" is for tests only and cannot be used in production');
    return undefined;
  }
  // A separate root folder per environment keeps test uploads out of production (plan §9.1).
  if (isProduction && !raw.CLOUDINARY_ROOT_FOLDER) {
    issue('CLOUDINARY_ROOT_FOLDER', 'is required in production');
    return undefined;
  }
  const rootFolder = raw.CLOUDINARY_ROOT_FOLDER ?? `roman-budhathoki/${raw.NODE_ENV}`;
  const limits = {
    maxBytes: {
      image: raw.MEDIA_MAX_IMAGE_MB * MEGABYTE,
      audio: raw.MEDIA_MAX_AUDIO_MB * MEGABYTE,
      video: raw.MEDIA_MAX_VIDEO_MB * MEGABYTE,
    },
  };

  if (raw.MEDIA_DRIVER === 'fake') {
    return { driver: 'fake' as const, rootFolder, limits };
  }

  const cloudName = raw.CLOUDINARY_CLOUD_NAME ?? '';
  const apiKey = raw.CLOUDINARY_API_KEY ?? '';
  const apiSecret = raw.CLOUDINARY_API_SECRET ?? '';
  const missing = [
    ['CLOUDINARY_CLOUD_NAME', cloudName],
    ['CLOUDINARY_API_KEY', apiKey],
    ['CLOUDINARY_API_SECRET', apiSecret],
  ].filter(([, value]) => value === '');
  if (missing.length > 0) {
    for (const [name = ''] of missing) {
      issue(name, 'is required (or set MEDIA_DRIVER=fake for tests)');
    }
    return undefined;
  }

  return {
    driver: 'cloudinary' as const,
    rootFolder,
    limits,
    cloudinary: { cloudName, apiKey, apiSecret, folderMode: raw.CLOUDINARY_FOLDER_MODE },
  };
}

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
