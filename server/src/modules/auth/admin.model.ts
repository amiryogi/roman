import { model, Schema } from 'mongoose';

import type { Timestamps } from '../../lib/mongo.js';

export interface AdminDoc extends Timestamps {
  email: string;
  /** argon2id hash. Never mapped into a DTO. */
  passwordHash: string;
  name: string;
  lastLoginAt?: Date;
  /** Access tokens issued before this instant are rejected. */
  passwordChangedAt?: Date;
}

const adminSchema = new Schema<AdminDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    lastLoginAt: Date,
    passwordChangedAt: Date,
  },
  { timestamps: true },
);

export const AdminModel = model<AdminDoc>('Admin', adminSchema);
