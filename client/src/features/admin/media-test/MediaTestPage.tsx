import { useId, useState } from 'react';

import {
  UPLOAD_KIND_RULES,
  UPLOAD_KINDS,
  uploadKindSchema,
  type MediaAssetDto,
  type UploadKind,
} from '@roman/shared';

import { ResponsiveImage } from '@/components/media/ResponsiveImage';
import { MediaUploader } from '@/features/admin/components/MediaUploader';
import { env } from '@/lib/env';

/**
 * TEMPORARY (Phase 4 acceptance check): try the upload pipeline end to end before any content
 * form exists. Remove once the track and gallery editors (Phases 6–7) use MediaUploader.
 * Files uploaded here aren't attached to any content, so `npm run cleanup:media` removes them.
 */
export function MediaTestPage() {
  const selectId = useId();
  const [kind, setKind] = useState<UploadKind>('gallery');
  const [asset, setAsset] = useState<MediaAssetDto | null>(null);

  return (
    <section className="flex max-w-3xl flex-col gap-6">
      <title>Media test · Admin · Roman Budhathoki</title>
      <div>
        <h1 className="text-2xl font-semibold">Media upload test</h1>
        <p className="mt-2 text-stone-600">
          Temporary page for checking uploads. Files uploaded here are not attached to any content
          and are removed by the media cleanup.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium text-stone-800">
          Upload kind
        </label>
        <select
          id={selectId}
          value={kind}
          onChange={(event) => {
            const parsed = uploadKindSchema.safeParse(event.currentTarget.value);
            if (parsed.success) {
              setKind(parsed.data);
              setAsset(null);
            }
          }}
          className="max-w-xs rounded-sm border border-stone-300 bg-white px-3 py-2"
        >
          {UPLOAD_KINDS.map((option) => (
            <option key={option} value={option}>
              {option} ({UPLOAD_KIND_RULES[option].mediaKind})
            </option>
          ))}
        </select>
      </div>

      <MediaUploader
        key={kind}
        kind={kind}
        label="File"
        value={asset}
        onChange={setAsset}
        removable
      />

      {asset && (
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Verified by the server</h2>
          {asset.resourceType === 'image' && env.cloudinaryCloudName && (
            <ResponsiveImage
              asset={asset}
              alt="Uploaded test image"
              sizes="(min-width: 768px) 40rem, 100vw"
              className="h-auto w-full max-w-xl"
            />
          )}
          <pre className="overflow-x-auto rounded-sm bg-stone-900 p-4 text-sm text-stone-100">
            {JSON.stringify(asset, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
