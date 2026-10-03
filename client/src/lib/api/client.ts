import { z } from 'zod';

import {
  apiErrorBodySchema,
  paginationMetaSchema,
  authResponseDtoSchema,
  type ApiErrorDetail,
  type AuthResponseDto,
  type ErrorCode,
  type Paginated,
} from '@roman/shared';

import { env } from '@/lib/env';

export type ClientErrorCode = ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'INVALID_RESPONSE';

/** Every failure from the API layer is one of these (plan §22). */
export class ApiClientError extends Error {
  override readonly name = 'ApiClientError';

  constructor(
    readonly status: number,
    readonly code: ClientErrorCode,
    message: string,
    readonly details: ApiErrorDetail[] = [],
  ) {
    super(message);
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Send the admin access token, and refresh it once if it has expired. */
  auth?: boolean;
  signal?: AbortSignal;
}

const REQUEST_TIMEOUT_MS = 15_000;

// The envelope is checked first, then `data` against the endpoint's own schema.
const successEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  meta: paginationMetaSchema.optional(),
});

// --- Admin session: the access token lives in memory only (plan §11.2) ---------------------------

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponseDto | null> | null = null;
const sessionExpiredListeners = new Set<() => void>();

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** Called when the session can no longer be renewed (e.g. signed out elsewhere). */
export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired(): void {
  accessToken = null;
  for (const listener of sessionExpiredListeners) listener();
}

// --- Transport ------------------------------------------------------------------------------------

async function send(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<Response> {
  const headers = new Headers({ Accept: 'application/json', 'X-Requested-With': 'fetch' });
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;

  try {
    return await fetch(`${env.apiBaseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'same-origin',
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new ApiClientError(0, 'TIMEOUT', 'The server took too long to respond.');
    }
    // Cancelled by the caller (e.g. component unmounted): let it propagate untouched.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Could not reach the server.');
  }
}

async function readJson(res: Response): Promise<unknown> {
  try {
    const value: unknown = await res.json();
    return value;
  } catch {
    return undefined;
  }
}

async function toApiError(res: Response): Promise<ApiClientError> {
  const parsed = apiErrorBodySchema.safeParse(await readJson(res));
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiClientError(res.status, code, message, details);
  }
  return new ApiClientError(res.status, 'INVALID_RESPONSE', 'Unexpected response from the server.');
}

async function execute(path: string, options: RequestOptions): Promise<Response> {
  const res = await send(path, options, options.auth ? accessToken : null);
  if (res.ok) return res;

  const error = await toApiError(res);
  if (!options.auth || error.status !== 401) throw error;

  if (error.code === 'TOKEN_EXPIRED') {
    const session = await refreshSession();
    if (session) {
      const retry = await send(path, options, session.accessToken);
      if (retry.ok) return retry;
      const retryError = await toApiError(retry);
      if (retryError.status === 401) notifySessionExpired();
      throw retryError;
    }
  }
  notifySessionExpired();
  throw error;
}

/** Performs a request and validates the success envelope's `data` against `schema`. */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  schema: S,
  options: RequestOptions = {},
): Promise<z.output<S>> {
  const res = await execute(path, options);
  const envelope = successEnvelopeSchema.safeParse(await readJson(res));
  const data = envelope.success ? schema.safeParse(envelope.data.data) : undefined;
  if (!data?.success) {
    throw new ApiClientError(
      res.status,
      'INVALID_RESPONSE',
      'Unexpected response from the server.',
    );
  }
  return data.data;
}

/** For paginated lists: validates each item and requires the pagination `meta`. */
export async function apiRequestPage<S extends z.ZodType>(
  path: string,
  itemSchema: S,
  options: RequestOptions = {},
): Promise<Paginated<z.output<S>>> {
  const res = await execute(path, options);
  const envelope = successEnvelopeSchema.safeParse(await readJson(res));
  const items = envelope.success ? z.array(itemSchema).safeParse(envelope.data.data) : undefined;
  if (!envelope.success || !envelope.data.meta || !items?.success) {
    throw new ApiClientError(
      res.status,
      'INVALID_RESPONSE',
      'Unexpected response from the server.',
    );
  }
  return { items: items.data, meta: envelope.data.meta };
}

/** For endpoints that answer 204 No Content. */
export async function apiRequestNoContent(
  path: string,
  options: RequestOptions = {},
): Promise<void> {
  await execute(path, options);
}

/**
 * Exchanges the refresh cookie for a new access token. Concurrent callers share one request,
 * because the server rotates the cookie and only the first exchange succeeds.
 * Resolves to null when there is no valid session.
 */
export function refreshSession(): Promise<AuthResponseDto | null> {
  refreshInFlight ??= (async () => {
    try {
      const session = await apiRequest('/auth/refresh', authResponseDtoSchema, { method: 'POST' });
      accessToken = session.accessToken;
      return session;
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 401) {
        accessToken = null;
        return null;
      }
      throw error;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}
