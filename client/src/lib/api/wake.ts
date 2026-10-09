/*
 * Waiting out a sleeping API (plan §0.4). The free Render instance sleeps after 15 idle minutes and
 * takes up to a minute to wake; meanwhile requests time out, or the proxies in front of it (Vercel,
 * Render) answer 502/503/504. The API client loads this module only when a request is slow or meets
 * a sleeping server, so ordinary visits never download it (the public pages' JS budget is tight).
 * No static imports on purpose: the API client's preload list for it stays one file long.
 */

/** How long to keep trying after the first failure. */
const WAKE_BUDGET_MS = 100_000;
/** Pauses between attempts; the last one repeats. */
const RETRY_DELAYS_MS = [1000, 2000, 3000, 5000];

function wait(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('The request was cancelled.', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', abort);
      resolve();
    }, ms);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

/** A failed attempt (a client error with a code) or a response, as the API client sees them. */
type Outcome = Response | { code: string };

/** Whether an attempt looks like the API is still starting, rather than a real answer. */
function isAsleep(outcome: Outcome): boolean {
  if (outcome instanceof Response) return outcome.status > 501 && outcome.status < 505;
  // Offline is the visitor's connection, not the server: report it straight away.
  return outcome.code === 'TIMEOUT' || navigator.onLine;
}

/**
 * If `first` looks like a sleeping API, shows the notice for `request` and repeats `attempt` until
 * the API answers or the budget runs out; returns the last outcome. Rejects with an AbortError if
 * `signal` is aborted while waiting. The caller clears the notice for `request` when it is done.
 */
export async function retryWhileAsleep<T extends Outcome>(
  request: symbol,
  first: T,
  attempt: () => Promise<T>,
  signal: AbortSignal | undefined,
): Promise<T> {
  let outcome = first;
  if (!isAsleep(outcome)) return outcome;
  setWaiting(request, true);

  const deadline = Date.now() + WAKE_BUDGET_MS;
  for (let retry = 0; isAsleep(outcome); retry += 1) {
    const delay = RETRY_DELAYS_MS[Math.min(retry, RETRY_DELAYS_MS.length - 1)] ?? 0;
    if (Date.now() + delay > deadline) break;
    await wait(delay, signal);
    outcome = await attempt();
  }
  return outcome;
}

// --- The "tuning up" notice -----------------------------------------------------------------------

const waiting = new Set<symbol>();
const listeners = new Set<() => void>();
const importNotice = () => import('./wakeNotice');
let noticeModule: ReturnType<typeof importNotice> | undefined;

export function isServerWaking(): boolean {
  return waiting.size > 0;
}

/** For loading states that step aside while the notice explains the wait (admin PageSpinner). */
export function subscribeWaking(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Marks one request as waiting for the API (or done waiting). The notice shows while any request
 * is waiting; it is loaded the first time it is needed.
 */
export function setWaiting(request: symbol, isWaiting: boolean): void {
  const wasWaking = isServerWaking();
  if (isWaiting) waiting.add(request);
  else waiting.delete(request);
  if (isServerWaking() !== wasWaking) for (const listener of listeners) listener();
  if (!isWaiting && !noticeModule) return;
  // The state is read when the module is ready, so quick on/off changes settle correctly.
  (noticeModule ??= importNotice()).then(
    (notice) => {
      notice.showNotice(isServerWaking());
    },
    () => undefined,
  );
}
