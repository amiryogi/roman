// Creates the site's single administrator, or resets their password with --reset (plan §11.2).
//
//   npm run seed:admin -- --email owner@example.com --name "Roman Budhathoki"
//   npm run seed:admin -- --email owner@example.com --reset
//
// The password is read from ADMIN_SEED_PASSWORD, or prompted for (visible as you type).
// Remove ADMIN_SEED_PASSWORD from the environment afterwards.
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

import { emailSchema, PASSWORD_MIN_LENGTH } from '@roman/shared';

import { configureMongoose, connectDb, disconnectDb } from '../config/db.js';
import { loadEnv } from '../config/env.js';
import { hashPassword } from '../lib/password.js';
import { AdminModel } from '../modules/auth/admin.model.js';
import { revokeAllSessions } from '../modules/auth/service.js';

class SeedError extends Error {}

async function readPassword(): Promise<string> {
  const fromEnv = process.env.ADMIN_SEED_PASSWORD;
  if (fromEnv) return fromEnv;

  const rl = createInterface({ input: stdin, output: stdout });
  try {
    console.warn('Note: the password will be visible while you type.');
    return await rl.question(`Password (min ${String(PASSWORD_MIN_LENGTH)} characters): `);
  } finally {
    rl.close();
  }
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      email: { type: 'string' },
      name: { type: 'string' },
      reset: { type: 'boolean', default: false },
    },
  });

  const email = emailSchema.safeParse(values.email ?? process.env.ADMIN_SEED_EMAIL);
  if (!email.success) throw new SeedError('Provide a valid --email (or ADMIN_SEED_EMAIL).');

  const password = await readPassword();
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new SeedError(`The password must be at least ${String(PASSWORD_MIN_LENGTH)} characters.`);
  }

  const env = loadEnv();
  configureMongoose({ autoIndex: false });
  await connectDb(env.mongodbUri, { dnsServers: env.dnsServers });

  const normalisedEmail = email.data.toLowerCase();
  const existing = await AdminModel.findOne({ email: normalisedEmail });

  if (existing) {
    if (!values.reset) {
      throw new SeedError(`${normalisedEmail} already exists. Use --reset to set a new password.`);
    }
    existing.passwordHash = await hashPassword(password);
    existing.passwordChangedAt = new Date();
    await existing.save();
    await revokeAllSessions(existing._id);
    console.info(`Password reset for ${normalisedEmail}. All sessions were signed out.`);
    return;
  }

  if ((await AdminModel.countDocuments()) > 0) {
    throw new SeedError('An administrator already exists. This site supports a single admin.');
  }

  const name = values.name?.trim() ?? '';
  await AdminModel.create({
    email: normalisedEmail,
    name: name === '' ? 'Administrator' : name,
    passwordHash: await hashPassword(password),
  });
  console.info(`Administrator ${normalisedEmail} created.`);
}

try {
  await main();
} catch (error) {
  console.error(error instanceof SeedError ? error.message : error);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
