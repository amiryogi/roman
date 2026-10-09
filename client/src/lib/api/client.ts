import type { z } from 'zod';

import type { ApiErrorDetail, AuthResponseDto, ErrorCode, Paginated } from '@roman/shared';

import { env } from '@/lib/env';

import type { ResponseSchemas } from './validation';

/**
 * A response schema, or a function that picks one of the public response schemas. Public code uses
 * the picker form, `(s) => s.homeDtoSchema`, so Zod and the schemas load with the first request
 * instead of with the page (plan §16). Admin code, which is lazy-loaded anyway, passes schemas.
 */
export type SchemaSource<S extends z.ZodType> = S | ((schemas: ResponseSchemas) => S);

function isPicker<S extends z.ZodType>(
  source: SchemaSource<S>,
): source is (schemas: ResponseSchemas) => S {
  return typeof source === 'function';
}

/** The validation chunk. A failed download (e.g. offline) is reported like a failed request. */
function loadValidation() {
  const loading = import('./validation').catch(() => {
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Could not reach the server.');
  });
  // The request may fail first; the caller then never awaits this, so don't report it unhandled.
  loading.catch(() => undefined);
  return loading;
}

export type ClientErrorCode =
  ErrorCode | 'NETWORK_ERROR' | 'TIMEOUT' | 'SERVER_UNAVAILABLE' | 'INVALID_RESPONSE';

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

/** A request unanswered for this long is probably waiting for the API to wake (see wake.ts). */
const SLOW_REQUEST_MS = 3500;
/** 502–504: a proxy's answer (Vercel, Render) while the API is still starting. */
function isGateway(status: number): boolean {
  return status > 501 && status < 505;
}

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

const importWake = () => import('./wake');
/** Loaded on first need only: ordinary visits never download it. */
let wakeModule: ReturnType<typeof importWake> | undefined;

/**
 * `send`, showing the "tuning up" notice while a request seems to wait for the API to wake, and
 * retrying reads until it answers (wake.ts). Writes are never retried: they may have happened.
 */
async function sendAwaitingServer(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<Response> {
  const request = Symbol(path);
  // Marking "done" never loads the module: only a request that waited has anything to clear.
  // Same promise, so "done" always runs after the slow timer's "waiting".
  const mark = (waiting: boolean) => {
    const module = waiting ? (wakeModule ??= importWake()) : wakeModule;
    module?.then(
      (wake) => {
        wake.setWaiting(request, waiting);
      },
      () => undefined,
    );
  };
  const slow = setTimeout(mark, SLOW_REQUEST_MS, true);
  const attempt = () =>
    send(path, options, token).catch((error: unknown) => {
      if (error instanceof ApiClientError) return error;
      throw error;
    });

  try {
    let outcome = await attempt();
    // A read that timed out, failed or met a proxy's 502–504: the API may be asleep (wake.ts
    // decides, then retries).
    if (
      (options.method ?? 'GET') === 'GET' &&
      !(outcome instanceof Response && !isGateway(outcome.status))
    ) {
      const wake = await (wakeModule ??= importWake());
      outcome = await wake.retryWhileAsleep(request, outcome, attempt, options.signal);
    }
    if (outcome instanceof ApiClientError) throw outcome;
    return outcome;
  } finally {
    clearTimeout(slow);
    mark(false);
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
  const [body, { parseErrorBody }] = await Promise.all([readJson(res), loadValidation()]);
  const error = parseErrorBody(body);
  if (error) return new ApiClientError(res.status, error.code, error.message, error.details);
  // A proxy's answer (e.g. Vercel or Render while the API is still starting), not the API's.
  if (isGateway(res.status)) {
    return new ApiClientError(res.status, 'SERVER_UNAVAILABLE', 'The server is unavailable.');
  }
  return new ApiClientError(res.status, 'INVALID_RESPONSE', 'Unexpected response from the server.');
}

async function execute(path: string, options: RequestOptions): Promise<Response> {
  const res = await sendAwaitingServer(path, options, options.auth ? accessToken : null);
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

function invalidResponse(res: Response): ApiClientError {
  return new ApiClientError(res.status, 'INVALID_RESPONSE', 'Unexpected response from the server.');
}

/** Performs a request and validates the success envelope's `data` against `schema`. */
export async function apiRequest<S extends z.ZodType>(
  path: string,
  schema: SchemaSource<S>,
  options: RequestOptions = {},
): Promise<z.output<S>> {
  // Started first, so the validation code downloads while the request is in flight.
  const validation = loadValidation();
  const res = await execute(path, options);
  const [body, { parseData, schemas }] = await Promise.all([readJson(res), validation]);
  const data = parseData(body, isPicker(schema) ? schema(schemas) : schema);
  if (data === undefined) throw invalidResponse(res);
  return data;
}

/** For paginated lists: validates each item and requires the pagination `meta`. */
export async function apiRequestPage<S extends z.ZodType>(
  path: string,
  itemSchema: SchemaSource<S>,
  options: RequestOptions = {},
): Promise<Paginated<z.output<S>>> {
  const validation = loadValidation();
  const res = await execute(path, options);
  const [body, { parsePage, schemas }] = await Promise.all([readJson(res), validation]);
  const page = parsePage(body, isPicker(itemSchema) ? itemSchema(schemas) : itemSchema);
  if (!page) throw invalidResponse(res);
  return page;
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
      const session = await apiRequest(
        '/auth/refresh',
        (schemas) => schemas.authResponseDtoSchema,
        {
          method: 'POST',
        },
      );
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
