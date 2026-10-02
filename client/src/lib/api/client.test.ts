import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  apiRequest,
  ApiClientError,
  onSessionExpired,
  refreshSession,
  setAccessToken,
} from './client';

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function errorResponse(status: number, code: string, message = 'Server message') {
  return jsonResponse(status, { success: false, error: { code, message, requestId: 'req-1' } });
}

const ADMIN = { id: '64b7f0c2a1b2c3d4e5f60718', email: 'owner@example.com', name: 'Owner' };

function sessionResponse(accessToken: string) {
  return jsonResponse(200, { success: true, data: { accessToken, expiresIn: 900, admin: ADMIN } });
}

function urlOf(input: Parameters<typeof fetch>[0]): string {
  return typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
}

function authHeaderOf(init: RequestInit | undefined): string | null {
  return new Headers(init?.headers).get('Authorization');
}

const itemSchema = z.object({ title: z.string() });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  setAccessToken(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('returns data validated against the schema', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { title: 'Live' } }));

    await expect(apiRequest('/things/1', itemSchema)).resolves.toEqual({ title: 'Live' });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe('/api/things/1');
    expect(new Headers(init?.headers).get('X-Requested-With')).toBe('fetch');
    expect(authHeaderOf(init)).toBeNull();
  });

  it('turns the error envelope into an ApiClientError', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Some fields are invalid.',
          details: [{ path: 'email', message: 'Invalid email' }],
          requestId: 'req-1',
        },
      }),
    );

    const error: unknown = await apiRequest('/things', itemSchema).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error).toMatchObject({ status: 422, code: 'VALIDATION_ERROR' });
    expect(error instanceof ApiClientError && error.details[0]?.path).toBe('email');
  });

  it('rejects data that does not match the schema', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { success: true, data: { title: 42 } }));

    await expect(apiRequest('/things/1', itemSchema)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('reports network failures', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiRequest('/things', itemSchema)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});

describe('authenticated requests', () => {
  it('refreshes an expired token once and retries with the new one', async () => {
    setAccessToken('old-token');
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, 'TOKEN_EXPIRED'))
      .mockResolvedValueOnce(sessionResponse('new-token'))
      .mockResolvedValueOnce(jsonResponse(200, { success: true, data: { title: 'Secret' } }));

    await expect(apiRequest('/admin/things', itemSchema, { auth: true })).resolves.toEqual({
      title: 'Secret',
    });

    const calls = fetchMock.mock.calls;
    expect(authHeaderOf(calls[0]?.[1])).toBe('Bearer old-token');
    expect(calls[1]?.[0]).toBe('/api/auth/refresh');
    expect(authHeaderOf(calls[2]?.[1])).toBe('Bearer new-token');
  });

  it('shares one refresh between concurrent requests', async () => {
    setAccessToken('old-token');
    let refreshCalls = 0;
    fetchMock.mockImplementation((input, init) => {
      if (urlOf(input).endsWith('/auth/refresh')) {
        refreshCalls += 1;
        return Promise.resolve(sessionResponse('new-token'));
      }
      return Promise.resolve(
        authHeaderOf(init) === 'Bearer new-token'
          ? jsonResponse(200, { success: true, data: { title: 'ok' } })
          : errorResponse(401, 'TOKEN_EXPIRED'),
      );
    });

    await Promise.all([
      apiRequest('/admin/a', itemSchema, { auth: true }),
      apiRequest('/admin/b', itemSchema, { auth: true }),
    ]);

    expect(refreshCalls).toBe(1);
  });

  it('signals session expiry when the refresh fails', async () => {
    setAccessToken('old-token');
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    fetchMock
      .mockResolvedValueOnce(errorResponse(401, 'TOKEN_EXPIRED'))
      .mockResolvedValueOnce(errorResponse(401, 'UNAUTHENTICATED'));

    await expect(apiRequest('/admin/things', itemSchema, { auth: true })).rejects.toMatchObject({
      code: 'TOKEN_EXPIRED',
    });
    expect(listener).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it('does not signal expiry for non-auth errors', async () => {
    setAccessToken('token');
    const listener = vi.fn();
    const unsubscribe = onSessionExpired(listener);
    fetchMock.mockResolvedValue(errorResponse(422, 'VALIDATION_ERROR'));

    await expect(apiRequest('/admin/things', itemSchema, { auth: true })).rejects.toBeInstanceOf(
      ApiClientError,
    );
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

describe('refreshSession', () => {
  it('resolves to null when there is no session', async () => {
    fetchMock.mockResolvedValue(errorResponse(401, 'UNAUTHENTICATED'));

    await expect(refreshSession()).resolves.toBeNull();
  });
});
