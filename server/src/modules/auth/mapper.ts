import type { AdminDto } from '@roman/shared';

import { optionalIsoDateTime } from '../../lib/dates.js';
import type { WithId } from '../../lib/mongo.js';
import type { AdminDoc } from './admin.model.js';

export function toAdminDto(doc: WithId<AdminDoc>): AdminDto {
  return {
    id: doc._id.toHexString(),
    email: doc.email,
    name: doc.name,
    lastLoginAt: optionalIsoDateTime(doc.lastLoginAt),
  };
}
