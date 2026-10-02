// Opt-in smoke test against the real Cloudinary account (plan §19). Not run in CI.
// Exercises the same path as the admin panel: a signed direct upload, then server verification.
// Only runs against a non-production root folder; everything it uploads is deleted again.
//
//   npm run test:cloudinary
import {
  AUDIO_STREAM_FORMAT,
  AUDIO_STREAM_TRANSFORMATION,
  MEDIA_DELIVERY_TYPE,
  type UploadKind,
} from '@roman/shared';

import { AppError } from '../lib/AppError.js';
import type { AssetRef, MediaService } from '../services/media/MediaService.js';
import { verifyUpload } from '../services/media/verify.js';
import { loadMediaScriptEnv, ScriptError } from './scriptEnv.js';

// 1×1 PNG and GIF.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');

/** One second of 8 kHz mono 16-bit silence as a WAV file. */
function silentWav(seconds = 1, sampleRate = 8000): Buffer {
  const dataBytes = seconds * sampleRate * 2;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataBytes, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  return Buffer.concat([header, Buffer.alloc(dataBytes)]);
}

interface UploadAttempt {
  status: number;
  body: unknown;
}

/** Uploads like the browser does: form fields exactly as signed, plus the file. */
async function directUpload(
  media: MediaService,
  kind: UploadKind,
  file: { bytes: Buffer; name: string; type: string },
  tamper: Record<string, string> = {},
): Promise<UploadAttempt> {
  const signature = await media.createUploadSignature(kind);
  const form = new FormData();
  for (const [key, value] of Object.entries({ ...signature.params, ...tamper })) {
    form.append(key, value);
  }
  form.append('api_key', signature.apiKey);
  form.append('timestamp', String(signature.timestamp));
  form.append('signature', signature.signature);
  form.append('file', new Blob([file.bytes], { type: file.type }), file.name);
  const res = await fetch(signature.uploadUrl, { method: 'POST', body: form });
  const body: unknown = await res.json();
  return { status: res.status, body };
}

function refOf(attempt: UploadAttempt, resourceType: AssetRef['resourceType']): AssetRef {
  const { body } = attempt;
  if (
    attempt.status !== 200 ||
    typeof body !== 'object' ||
    body === null ||
    !('public_id' in body) ||
    typeof body.public_id !== 'string'
  ) {
    throw new ScriptError(`Upload failed (${String(attempt.status)}): ${JSON.stringify(body)}`);
  }
  return { publicId: body.public_id, resourceType };
}

function check(condition: boolean, description: string): void {
  if (!condition) throw new ScriptError(`FAILED: ${description}`);
  console.info(`  ok  ${description}`);
}

async function expectMediaInvalid(promise: Promise<unknown>): Promise<boolean> {
  try {
    await promise;
    return false;
  } catch (error) {
    return error instanceof AppError && error.code === 'MEDIA_INVALID';
  }
}

const cleanup: AssetRef[] = [];
const { env, logger, media } = (() => {
  try {
    return loadMediaScriptEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();

try {
  if (env.isProduction || media.rootFolder.includes('production')) {
    throw new ScriptError(`Refusing to run against ${media.rootFolder}. Use a development folder.`);
  }
  if (env.media.driver !== 'cloudinary') throw new ScriptError('Cloudinary driver required.');
  console.info(
    `Cloudinary smoke test in ${media.rootFolder}/ (cloud ${env.media.cloudinary.cloudName})`,
  );

  // Image: signed upload → verification with metadata from Cloudinary.
  const image = refOf(
    await directUpload(media, 'gallery', { bytes: PNG, name: 'smoke.png', type: 'image/png' }),
    'image',
  );
  cleanup.push(image);
  check(
    image.publicId.startsWith(`${media.rootFolder}/gallery/`),
    'image lands in the gallery folder',
  );
  const imageAsset = await verifyUpload(media, 'gallery', image, logger);
  check(imageAsset.width === 1 && imageAsset.height === 1, 'image dimensions come from Cloudinary');
  check(Boolean(imageAsset.dominantColor), 'image has a dominant colour');

  // Originals are private (they can carry GPS metadata); transformed versions are public.
  const delivery = `https://res.cloudinary.com/${env.media.cloudinary.cloudName}/image/${MEDIA_DELIVERY_TYPE}`;
  const versioned = `v${String(imageAsset.version)}/${imageAsset.publicId}`;
  const original = await fetch(`${delivery}/${versioned}.png`);
  check(!original.ok, `the untransformed original is not public (${String(original.status)})`);
  const transformed = await fetch(`${delivery}/c_limit,w_100,f_auto,q_auto/${versioned}`);
  check(transformed.ok, `a transformed version is public (${String(transformed.status)})`);

  // Tampering: signed parameters can't be changed, and verification checks the folder.
  const tampered = await directUpload(
    media,
    'gallery',
    { bytes: PNG, name: 'smoke.png', type: 'image/png' },
    { asset_folder: `${media.rootFolder}/elsewhere` },
  );
  check(
    tampered.status === 401,
    `a changed folder is rejected by Cloudinary (${String(tampered.status)})`,
  );
  const gif = await directUpload(media, 'gallery', {
    bytes: GIF,
    name: 'x.gif',
    type: 'image/gif',
  });
  check(
    gif.status === 400,
    `a disallowed format is rejected by Cloudinary (${String(gif.status)})`,
  );
  check(
    await expectMediaInvalid(verifyUpload(media, 'track-cover', image, logger)),
    'an upload for another field is rejected',
  );
  check((await media.getResource(image)) !== null, '…and is not deleted');

  // Audio: stored as a "video" resource with a duration, streamed as MP3.
  const audio = refOf(
    await directUpload(media, 'track-audio', {
      bytes: silentWav(),
      name: 'smoke.wav',
      type: 'audio/wav',
    }),
    'video',
  );
  cleanup.push(audio);
  const audioAsset = await verifyUpload(media, 'track-audio', audio, logger);
  check(
    Math.abs((audioAsset.duration ?? 0) - 1) < 0.1,
    `audio duration is read (${String(audioAsset.duration)} s)`,
  );
  const streamUrl =
    `https://res.cloudinary.com/${env.media.cloudinary.cloudName}/video/${MEDIA_DELIVERY_TYPE}/` +
    `${AUDIO_STREAM_TRANSFORMATION}/v${String(audioAsset.version)}/${audioAsset.publicId}.${AUDIO_STREAM_FORMAT}`;
  const stream = await fetch(streamUrl);
  check(
    stream.ok && (stream.headers.get('content-type') ?? '').startsWith('audio/mpeg'),
    `audio streams as MP3 (${String(stream.status)} ${stream.headers.get('content-type') ?? ''})`,
  );

  console.info('Cloudinary smoke test passed.');
} catch (error) {
  console.error(error instanceof ScriptError ? error.message : error);
  process.exitCode = 1;
} finally {
  for (const ref of cleanup) {
    await media.destroy(ref).catch((error: unknown) => {
      console.error(`Could not delete ${ref.publicId}:`, error);
    });
  }
  if (cleanup.length > 0) console.info(`Cleaned up ${String(cleanup.length)} test assets.`);
}
