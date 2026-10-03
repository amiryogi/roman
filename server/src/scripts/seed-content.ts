// Uploads the provided photos and MP3 to Cloudinary and creates the initial content (plan §25,
// Phase 4): the profile from the CV, gallery images as drafts and one draft track.
// Safe to run again; nothing is duplicated and an existing profile is never overwritten.
//
//   npm run seed:content
//   npm run seed:content -- --source-dir /path/to/source-material
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { configureMongoose, connectDb, disconnectDb } from '../config/db.js';
import { loadMediaScriptEnv, ScriptError } from './scriptEnv.js';
import { seedContent } from './seed/seedContent.js';

// The repository root, from both src/scripts (tsx) and dist/scripts (node).
const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

try {
  const { values } = parseArgs({ options: { 'source-dir': { type: 'string' } } });
  const { env, logger, media } = loadMediaScriptEnv();
  configureMongoose({ autoIndex: false });
  await connectDb(env.mongodbUri, { dnsServers: env.dnsServers });

  const summary = await seedContent({
    sourceDir: values['source-dir'] ?? REPO_ROOT,
    media,
    logger,
  });
  console.info(
    [
      `Seed complete in ${media.rootFolder}:`,
      `  media: ${String(summary.uploaded)} uploaded, ${String(summary.reused)} already there`,
      `  profile: ${summary.profile}`,
      `  gallery drafts created: ${String(summary.galleryCreated)}`,
      `  draft track created: ${summary.trackCreated ? 'yes' : 'no (already there)'}`,
      'Review the drafts in the admin panel before publishing.',
    ].join('\n'),
  );
} catch (error) {
  console.error(error instanceof ScriptError ? error.message : error);
  process.exitCode = 1;
} finally {
  await disconnectDb();
}
