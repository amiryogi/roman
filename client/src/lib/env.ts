import { z } from 'zod';

const envSchema = z.object({
  // Relative by default: Vite proxies /api in development and Vercel rewrites it in production.
  VITE_API_BASE_URL: z.string().min(1).default('/api'),
  VITE_SITE_URL: z.url().default('http://localhost:5173'),
});

const parsed = envSchema.parse(import.meta.env);

export const env = {
  apiBaseUrl: parsed.VITE_API_BASE_URL.replace(/\/+$/, ''),
  siteUrl: parsed.VITE_SITE_URL.replace(/\/+$/, ''),
} as const;
