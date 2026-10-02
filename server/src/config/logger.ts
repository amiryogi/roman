import { pino, type Logger, type LevelWithSilent } from 'pino';

export type { Logger };

// Never log credentials, cookies or personal message content (plan §15).
const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.currentPassword',
  '*.newPassword',
  '*.accessToken',
  '*.refreshToken',
];

export function createLogger(options: { level: LevelWithSilent; pretty: boolean }): Logger {
  return pino({
    level: options.level,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
    ...(options.pretty
      ? {
          transport: { target: 'pino-pretty', options: { colorize: true, ignore: 'pid,hostname' } },
        }
      : {}),
  });
}

export const silentLogger: Logger = pino({ level: 'silent' });
