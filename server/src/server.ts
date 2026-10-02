import { createApp } from './app.js';

// Phase 2 replaces this with Zod-validated configuration (config/env.ts).
const DEFAULT_PORT = 4000;
const port = Number.parseInt(process.env.PORT ?? '', 10) || DEFAULT_PORT;

const server = createApp().listen(port, () => {
  console.info(`API listening on http://localhost:${String(port)}`);
});

function shutdown(signal: NodeJS.Signals): void {
  console.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
