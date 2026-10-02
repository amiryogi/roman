import { z } from 'zod';

const cloudNameSchema = z
  .string()
  .regex(/^[a-z0-9_-]+$/i, 'VITE_CLOUDINARY_CLOUD_NAME is not a valid cloud name');

const envSchema = z.object({
  // Relative by default: Vite proxies /api in development and Vercel rewrites it in production.
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_SITE_URL: z.url().default('http://localhost:5173'),
  // Media URLs can't be built without it, so production builds require it (plan §21.1).
  VITE_CLOUDINARY_CLOUD_NAME: import.meta.env.PROD
    ? cloudNameSchema
    : z.union([z.literal(''), cloudNameSchema]).optional(),
});

const parsed = envSchema.parse(import.meta.env);

export const env = {
  apiBaseUrl: parsed.VITE_API_BASE_URL.replace(/\/+$/, ''),
  siteUrl: parsed.VITE_SITE_URL.replace(/\/+$/, ''),
  cloudinaryCloudName:
    parsed.VITE_CLOUDINARY_CLOUD_NAME === '' ? undefined : parsed.VITE_CLOUDINARY_CLOUD_NAME,
} as const;
