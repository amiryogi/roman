// Checked by hand rather than with Zod, so the validation library isn't needed before the first
// page renders (plan §16).

const CLOUD_NAME = /^[a-z0-9_-]+$/i;

/** An unset variable and an empty one (`VITE_X=`) both mean "use the default". */
function nonEmpty(value: string | undefined): string | undefined {
  return value === '' ? undefined : value;
}

interface ClientEnv {
  apiBaseUrl: string;
  siteUrl: string;
  cloudinaryCloudName: string | undefined;
  /**
   * The API's own health address, bypassing Vercel: a sleeping Render instance wakes only for
   * requests sent to it directly (lib/api/wake.ts). Unset in development.
   */
  apiWakeUrl: string | undefined;
}

/** Reads the VITE_* variables. Exported for tests; the app uses `env`. */
export function parseEnv(
  source: Pick<
    ImportMetaEnv,
    'VITE_API_BASE_URL' | 'VITE_SITE_URL' | 'VITE_CLOUDINARY_CLOUD_NAME' | 'VITE_API_WAKE_URL'
  >,
  production: boolean,
): ClientEnv {
  // Relative by default: Vite proxies /api in development and Vercel rewrites it in production.
  const apiBaseUrl = nonEmpty(source.VITE_API_BASE_URL) ?? '/api';

  const siteUrl = nonEmpty(source.VITE_SITE_URL) ?? 'http://localhost:5173';
  if (!URL.canParse(siteUrl)) throw new Error('VITE_SITE_URL must be an absolute URL');

  // Media URLs can't be built without it, so production builds require it (plan §21.1).
  const cloudName = nonEmpty(source.VITE_CLOUDINARY_CLOUD_NAME);
  if (cloudName === undefined && production) {
    throw new Error('VITE_CLOUDINARY_CLOUD_NAME is required');
  }
  if (cloudName !== undefined && !CLOUD_NAME.test(cloudName)) {
    throw new Error('VITE_CLOUDINARY_CLOUD_NAME is not a valid cloud name');
  }

  const apiWakeUrl = nonEmpty(source.VITE_API_WAKE_URL);
  if (apiWakeUrl !== undefined && !URL.canParse(apiWakeUrl)) {
    throw new Error('VITE_API_WAKE_URL must be an absolute URL');
  }

  return {
    apiBaseUrl: apiBaseUrl.replace(/\/+$/, ''),
    siteUrl: siteUrl.replace(/\/+$/, ''),
    cloudinaryCloudName: cloudName,
    apiWakeUrl,
  };
}

export const env: Readonly<ClientEnv> = parseEnv(import.meta.env, import.meta.env.PROD);
