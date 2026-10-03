// Lists Cloudinary assets under CLOUDINARY_ROOT_FOLDER that no content references, such as
// uploads abandoned before a form was saved (plan §9.2). Dry run by default.
//
//   npm run cleanup:media                 # list orphans
//   npm run cleanup:media -- --apply      # delete them
//   npm run cleanup:media -- --min-age-hours 72
import { parseArgs } from 'node:util';

import { MEDIA_RESOURCE_TYPES } from '@roman/shared';

import { configureMongoose, connectDb, disconnectDb } from '../config/db.js';
import { collectReferencedPublicIds, findOrphans } from '../services/media/references.js';
import { loadMediaScriptEnv, ScriptError } from './scriptEnv.js';

try {
  const { values } = parseArgs({
    options: {
      apply: { type: 'boolean', default: false },
      'min-age-hours': { type: 'string', default: '24' },
    },
  });
  const minAgeHours = Number(values['min-age-hours']);
  if (!Number.isFinite(minAgeHours) || minAgeHours < 1) {
    throw new ScriptError('--min-age-hours must be a number of at least 1.');
  }

  const { env, media } = loadMediaScriptEnv();
  configureMongoose({ autoIndex: false });
  await connectDb(env.mongodbUri, { dnsServers: env.dnsServers });

  const referenced = await collectReferencedPublicIds();
  const resources = [];
  for (const resourceType of MEDIA_RESOURCE_TYPES) {
    resources.push(...(await media.listResources(resourceType)));
  }
  const orphans = findOrphans(resources, referenced, {
    now: new Date(),
    minAgeMs: minAgeHours * 60 * 60 * 1000,
  });

  console.info(
    `${String(resources.length)} assets under ${media.rootFolder}/, ` +
      `${String(orphans.length)} unreferenced and older than ${String(minAgeHours)} h.`,
  );
  for (const orphan of orphans) {
    const size = `${(orphan.bytes / 1024 / 1024).toFixed(1)} MB`;
    console.info(
      `  ${orphan.resourceType}  ${orphan.publicId}  (${size}, ${orphan.createdAt.toISOString()})`,
    );
  }

  if (orphans.length > 0 && !values.apply) {
    console.info('Dry run: nothing was deleted. Re-run with --apply to delete these assets.');
  }
  if (values.apply) {
    for (const orphan of orphans) {
      await media.destroy(orphan);
    }
    console.info(`Deleted ${String(orphans.length)} assets.`);
  }
} catch (error) {
  console.error(error instanceof ScriptError ? error.message : error);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
