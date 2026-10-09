import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import {
  apiRequest,
  apiRequestNoContent,
  ApiClientError,
  onSessionExpired,
  refreshSession,
  setAccessToken,
} from './client';
import { isServerWaking } from './wake';

// While requests wait, the "tuning up" notice renders in its own React root. These tests are about
// the API client, not that UI (publicSite.test.tsx covers it), so React's act() checks are off.
Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', false);

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
});

// The free Render instance sleeps when idle and takes up to a minute to wake (plan §0.4).
describe('a server waking from sleep', () => {
  const awake = () => jsonResponse(200, { success: true, data: { title: 'Awake' } });

  /** One real turn of the event loop (MessageChannel isn't faked). */
  function realTurn(): Promise<void> {
    return new Promise((resolve) => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => {
        channel.port1.close();
        resolve();
      };
      channel.port2.postMessage(null);
    });
  }

  /**
   * Runs fake timers one at a time until `promise` settles, with a real event-loop turn between
   * them so the on-demand wake module can load (module loading isn't driven by fake timers).
   */
  async function settle<T>(promise: Promise<T>): Promise<T> {
    const done = promise.then(
      () => true,
      () => true,
    );
    for (let turn = 0; turn < 500; turn += 1) {
      if (await Promise.race([done, realTurn().then(() => false)])) break;
      await vi.advanceTimersToNextTimerAsync();
    }
    return promise;
  }

  beforeEach(() => {
    // Only the clock and timeouts are faked, so module loading still progresses in settle().
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries reads through gateway errors and timeouts until the server answers', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response('Bad gateway', { status: 502 }))
      .mockRejectedValueOnce(new DOMException('Timed out', 'TimeoutError'))
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(awake());
    await expect(settle(apiRequest('/home', itemSchema))).resolves.toEqual({ title: 'Awake' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    await vi.waitFor(() => {
      expect(isServerWaking()).toBe(false);
    });
  });

  it('marks a slow request as waiting until its answer arrives', async () => {
    const pending: { answer?: (res: Response) => void } = {};
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        pending.answer = resolve;
      }),
    );

    const request = apiRequest('/home', itemSchema);
    await vi.advanceTimersByTimeAsync(3000);
    expect(isServerWaking()).toBe(false);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.waitFor(() => {
      expect(isServerWaking()).toBe(true);
    });

    pending.answer?.(awake());
    await expect(request).resolves.toEqual({ title: 'Awake' });
    await vi.waitFor(() => {
      expect(isServerWaking()).toBe(false);
    });
  });

  it('gives up after about 100 seconds with a clear error', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('', { status: 504 })));

    const start = Date.now();
    const error = await settle(apiRequest('/home', itemSchema).catch((e: unknown) => e));

    expect(error).toMatchObject({ code: 'SERVER_UNAVAILABLE', status: 504 });
    expect(Date.now() - start).toBeGreaterThan(90_000);
    expect(Date.now() - start).toBeLessThanOrEqual(100_000);
    expect(fetchMock.mock.calls.length).toBeGreaterThan(15);
    await vi.waitFor(() => {
      expect(isServerWaking()).toBe(false);
    });
  });

  it('never retries writes, which may already have happened', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 502 }));

    await expect(
      apiRequestNoContent('/inquiries', { method: 'POST', body: {} }),
    ).rejects.toMatchObject({ code: 'SERVER_UNAVAILABLE' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('does not retry real answers from the API', async () => {
    fetchMock.mockResolvedValue(errorResponse(404, 'NOT_FOUND'));

    await expect(apiRequest('/videos/x', itemSchema)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it('reports being offline at once instead of waiting', async () => {
    const onLine = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(apiRequest('/things', itemSchema)).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    onLine.mockRestore();
  });

  it('stops waiting when the caller cancels', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('', { status: 503 })));
    const controller = new AbortController();

    const request = apiRequest('/home', itemSchema, { signal: controller.signal }).catch(
      (error: unknown) => error,
    );
    // Wait until the client is pausing before its first retry, then cancel.
    await vi.waitFor(() => {
      expect(vi.getTimerCount()).toBeGreaterThan(1);
    });
    controller.abort();

    expect(await request).toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => {
      expect(isServerWaking()).toBe(false);
    });
    expect(fetchMock).toHaveBeenCalledOnce();
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
