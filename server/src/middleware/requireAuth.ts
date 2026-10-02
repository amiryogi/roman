import type { Request, RequestHandler } from 'express';

import { AppError } from '../lib/AppError.js';
import type { WithId } from '../lib/mongo.js';
import { verifyAccessToken } from '../lib/tokens.js';
import { AdminModel, type AdminDoc } from '../modules/auth/admin.model.js';
import type { AuthConfig } from '../modules/auth/config.js';

declare module 'express-serve-static-core' {
  interface Request {
    /** Set by requireAuth. Read it through `currentAdmin(req)`. */
    admin?: WithId<AdminDoc>;
  }
}

function unauthenticated(): AppError {
  return new AppError(401, 'UNAUTHENTICATED', 'Please sign in.');
}

/** Verifies the Bearer access token and loads the admin (plan §11.2). */
export function createRequireAuth(config: AuthConfig): RequestHandler {
  return async (req, _res, next) => {
    const header = req.get('authorization');
    const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length).trim() : '';
    if (!token) throw unauthenticated();

    const claims = verifyAccessToken(token, config);
    const admin = await AdminModel.findById(claims.sub).lean<WithId<AdminDoc>>();
    if (!admin) throw unauthenticated();

    // Tokens issued before a password change are no longer valid. Compared in whole seconds,
    // like `iat`, so a token issued right after the change is accepted.
    if (
      admin.passwordChangedAt &&
      claims.iat < Math.floor(admin.passwordChangedAt.getTime() / 1000)
    ) {
      throw new AppError(401, 'TOKEN_EXPIRED', 'Your session has expired.');
    }

    req.admin = admin;
    next();
  };
}

export function currentAdmin(req: Request): WithId<AdminDoc> {
  if (!req.admin) throw unauthenticated();
  return req.admin;
}
