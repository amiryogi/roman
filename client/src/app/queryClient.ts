import { QueryClient } from '@tanstack/react-query';

import { ApiClientError } from '@/lib/api/client';

/**
 * Only a one-off server error (500) is worth one more try. A 4xx answer can't improve; a timeout,
 * a sleeping server (status 0, 502–504) was already waited out for up to 100 s by the API client
 * (lib/api/wake.ts); and offline is retried when the connection returns (`refetchOnReconnect`).
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const status = error instanceof ApiClientError ? error.status : 500;
  return failureCount < 1 && (status === 500 || status === 501);
}

/**
 * Public defaults (plan §12.3). Data counts as fresh for 30 s, so moving between pages doesn't
 * refetch, and it is checked again when the tab regains focus, so something just published in the
 * admin shows up on return. The API answers unchanged data with a small 304 (ETag).
 */
export function createQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: shouldRetry,
        refetchOnWindowFocus: true,
      },
      // Mutations are never retried automatically (plan §22).
      mutations: { retry: false },
    },
  });
  // Admin data is always fetched fresh (plan §12.3); admin keys start with "admin".
  client.setQueryDefaults(['admin'], { staleTime: 0, gcTime: 5 * 60 * 1000 });
  return client;
}
