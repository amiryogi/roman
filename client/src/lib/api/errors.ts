import { ApiClientError } from './client';

/** One place that turns any error into a sentence for people (plan §22). */
export function getErrorMessage(error: unknown): string {
  if (!(error instanceof ApiClientError)) {
    return 'Something went wrong. Please try again.';
  }
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'You appear to be offline. Check your connection and try again.';
    case 'TIMEOUT':
      return 'The server is taking too long to respond. Please try again.';
    case 'RATE_LIMITED':
    case 'UNAUTHENTICATED':
    case 'VALIDATION_ERROR':
    case 'CONFLICT':
    case 'ALBUM_NOT_EMPTY':
    case 'MEDIA_INVALID':
    case 'NOT_FOUND':
      // These messages are written for people on the server.
      return error.message;
    case 'TOKEN_EXPIRED':
      return 'Your session has expired. Please sign in again.';
    case 'MEDIA_PROVIDER_ERROR':
      return 'The media service is unavailable right now. Please try again shortly.';
    case 'BAD_REQUEST':
    case 'FORBIDDEN':
    case 'PAYLOAD_TOO_LARGE':
    case 'UNSUPPORTED_MEDIA_TYPE':
    case 'INTERNAL_ERROR':
    case 'INVALID_RESPONSE':
      return 'Something went wrong on our side. Please try again later.';
  }
}
