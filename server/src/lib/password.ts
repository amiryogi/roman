import { randomBytes } from 'node:crypto';

import argon2 from 'argon2';

/** argon2id with the library defaults (64 MiB, t=3, p=4), above OWASP's minimum (plan §11.2). */
export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}

/** False for a wrong password or a malformed hash. Never throws. */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

let dummyHash: Promise<string> | undefined;

/**
 * Burns the same time as a real verification when the account doesn't exist,
 * so response timing doesn't reveal which emails are registered.
 */
export async function verifyAgainstDummy(password: string): Promise<false> {
  dummyHash ??= hashPassword(randomBytes(16).toString('hex'));
  await verifyPassword(await dummyHash, password);
  return false;
}
