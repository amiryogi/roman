import { randomUUID } from 'node:crypto';

import { pinoHttp, type HttpLogger } from 'pino-http';

import type { Logger } from '../config/logger.js';

const INCOMING_ID_PATTERN = /^[\w-]{8,64}$/;

/**
 * Request logging plus a request id on every request (`req.id`), echoed in X-Request-Id
 * and in error bodies so users' reports can be matched to logs.
 */
export function createRequestLogger(logger: Logger): HttpLogger {
  return pinoHttp({
    logger,
    genReqId: (req, res) => {
      const incoming = req.headers['x-request-id'];
      const id =
        typeof incoming === 'string' && INCOMING_ID_PATTERN.test(incoming)
          ? incoming
          : randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    customLogLevel: (_req, res, error) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    autoLogging: { ignore: (req) => req.url === '/api/health' },
  });
}
