import mongoose, { type Types } from 'mongoose';

import type { AdminDto, ChangePasswordInput, LoginInput } from '@roman/shared';

import { AppError } from '../../lib/AppError.js';
import type { WithId } from '../../lib/mongo.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../lib/password.js';
import { generateRefreshToken, hashToken, signAccessToken } from '../../lib/tokens.js';
import { AdminModel, type AdminDoc } from './admin.model.js';
import { ROTATION_GRACE_MS, type AuthConfig } from './config.js';
import { toAdminDto } from './mapper.js';
import { SessionModel, type SessionDoc } from './session.model.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface IssuedSession {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshExpiresAt: Date;
  admin: AdminDto;
}

function invalidCredentials(): AppError {
  return new AppError(401, 'UNAUTHENTICATED', 'Incorrect email or password.');
}

function sessionEnded(): AppError {
  return new AppError(401, 'UNAUTHENTICATED', 'Your session has ended. Please sign in again.');
}

async function issueSession(
  admin: WithId<AdminDoc>,
  config: AuthConfig,
  userAgent: string | undefined,
): Promise<IssuedSession> {
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + config.refreshTtlDays * DAY_MS);

  await SessionModel.create({
    adminId: admin._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshExpiresAt,
    userAgent: userAgent?.slice(0, 200),
  });

  return {
    accessToken: signAccessToken(admin._id.toHexString(), config),
    expiresIn: config.accessTtlSeconds,
    refreshToken,
    refreshExpiresAt,
    admin: toAdminDto(admin),
  };
}

/** Same error and similar timing whether the email is unknown or the password is wrong. */
export async function login(
  input: LoginInput,
  config: AuthConfig,
  userAgent: string | undefined,
): Promise<IssuedSession> {
  const admin = await AdminModel.findOne({ email: input.email.toLowerCase() }).lean<
    WithId<AdminDoc>
  >();
  if (!admin) {
    await verifyAgainstDummy(input.password);
    throw invalidCredentials();
  }
  if (!(await verifyPassword(admin.passwordHash, input.password))) {
    throw invalidCredentials();
  }

  const lastLoginAt = new Date();
  await AdminModel.updateOne({ _id: admin._id }, { $set: { lastLoginAt } });
  return issueSession({ ...admin, lastLoginAt }, config, userAgent);
}

/**
 * Rotates a refresh token (plan §11.2). The old session is atomically marked as rotated, so a
 * token can be exchanged only once. Presenting a rotated token after the grace window is
 * treated as theft: every session of that admin is revoked.
 */
export async function refreshSession(
  refreshToken: string,
  config: AuthConfig,
  userAgent: string | undefined,
): Promise<IssuedSession> {
  const tokenHash = hashToken(refreshToken);
  const now = new Date();

  const claimed = await SessionModel.findOneAndUpdate(
    {
      tokenHash,
      rotatedAt: mongoose.trusted({ $exists: false }),
      expiresAt: mongoose.trusted({ $gt: now }),
    },
    { $set: { rotatedAt: now } },
  ).lean<WithId<SessionDoc>>();

  if (!claimed) {
    const existing = await SessionModel.findOne({ tokenHash }).lean<WithId<SessionDoc>>();
    const rotatedAt = existing?.rotatedAt;
    if (existing && rotatedAt && now.getTime() - rotatedAt.getTime() > ROTATION_GRACE_MS) {
      await revokeAllSessions(existing.adminId);
    }
    throw sessionEnded();
  }

  const admin = await AdminModel.findById(claimed.adminId).lean<WithId<AdminDoc>>();
  if (!admin) throw sessionEnded();
  return issueSession(admin, config, userAgent);
}

export async function logout(refreshToken: string): Promise<void> {
  await SessionModel.deleteOne({ tokenHash: hashToken(refreshToken) });
}

export async function revokeAllSessions(adminId: Types.ObjectId): Promise<void> {
  await SessionModel.deleteMany({ adminId });
}

/**
 * Changes the password, invalidates every access token issued before now, and ends every other
 * session. The caller's own session (identified by its refresh cookie) survives, so the client
 * can refresh and carry on.
 */
export async function changePassword(
  admin: WithId<AdminDoc>,
  input: ChangePasswordInput,
  currentRefreshToken: string | undefined,
): Promise<void> {
  if (!(await verifyPassword(admin.passwordHash, input.currentPassword))) {
    throw AppError.validation('Your current password is incorrect.', [
      { path: 'currentPassword', message: 'Incorrect password' },
    ]);
  }

  await AdminModel.updateOne(
    { _id: admin._id },
    {
      $set: { passwordHash: await hashPassword(input.newPassword), passwordChangedAt: new Date() },
    },
  );

  if (currentRefreshToken) {
    await SessionModel.deleteMany({
      adminId: admin._id,
      tokenHash: mongoose.trusted({ $ne: hashToken(currentRefreshToken) }),
    });
  } else {
    await revokeAllSessions(admin._id);
  }
}
