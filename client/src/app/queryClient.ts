import { QueryClient } from '@tanstack/react-query';

import { ApiClientError } from '@/lib/api/client';

/** Retrying a 4xx answer (not found, validation) can't help; network and server errors can. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const clientError = error instanceof ApiClientError && error.status >= 400 && error.status < 500;
  return failureCount < 1 && !clientError;
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
