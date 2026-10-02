import mongoose from 'mongoose';

/**
 * Global Mongoose settings (plan §8.1, §15).
 *
 * sanitizeFilter wraps any `$`-prefixed object in a query filter with `$eq`, so injected operators
 * become literal values. Queries that intentionally use operators must wrap them with
 * `mongoose.trusted()`, e.g. `{ startsAt: mongoose.trusted({ $gte: now }) }`.
 */
export function configureMongoose(options: { autoIndex: boolean }): void {
  mongoose.set('strictQuery', true);
  mongoose.set('sanitizeFilter', true);
  mongoose.set('autoIndex', options.autoIndex);
}

export async function connectDb(uri: string): Promise<void> {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000 });
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}

export function isDbConnected(): boolean {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}
