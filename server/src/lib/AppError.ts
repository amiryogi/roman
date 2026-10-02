import type { ApiErrorDetail, ErrorCode } from '@roman/shared';

/** An expected, client-safe error. Anything else becomes a generic 500. */
export class AppError extends Error {
  override readonly name = 'AppError';

  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: ApiErrorDetail[],
  ) {
    super(message);
  }

  static notFound(message = 'The requested resource was not found.'): AppError {
    return new AppError(404, 'NOT_FOUND', message);
  }

  static conflict(message: string, details?: ApiErrorDetail[]): AppError {
    return new AppError(409, 'CONFLICT', message, details);
  }

  static validation(message: string, details?: ApiErrorDetail[]): AppError {
    return new AppError(422, 'VALIDATION_ERROR', message, details);
  }

  static mediaInvalid(message: string): AppError {
    return new AppError(422, 'MEDIA_INVALID', message);
  }
}
