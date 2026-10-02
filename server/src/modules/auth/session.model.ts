import { model, Schema, type Types } from 'mongoose';

import type { Timestamps } from '../../lib/mongo.js';

/** One refresh-token session (plan §11). Expired sessions are removed by the TTL index. */
export interface SessionDoc extends Timestamps {
  adminId: Types.ObjectId;
  /** SHA-256 of the opaque refresh token; the token itself is never stored. */
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  /** Set when the token was rotated. Presenting a rotated token revokes every session. */
  rotatedAt?: Date;
}

const sessionSchema = new Schema<SessionDoc>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, expires: 0 },
    userAgent: { type: String, maxlength: 200 },
    rotatedAt: Date,
  },
  { timestamps: true },
);

export const SessionModel = model<SessionDoc>('Session', sessionSchema);
