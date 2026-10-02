import { QueryClient } from '@tanstack/react-query';

import { ApiClientError } from '@/lib/api/client';

/** Retrying a 4xx answer (not found, validation) can't help; network and server errors can. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  const clientError = error instanceof ApiClientError && error.status >= 400 && error.status < 500;
  return failureCount < 1 && !clientError;
}

/** Public defaults (plan §12.3): the content is mostly static, so fetch rarely. */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        gcTime: 30 * 60 * 1000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      // Mutations are never retried automatically (plan §22).
      mutations: { retry: false },
    },
  });
}
