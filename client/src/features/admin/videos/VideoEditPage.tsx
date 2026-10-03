import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, useWatch, type DefaultValues, type Path } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { z } from 'zod';

import {
  VIDEO_CATEGORIES,
  videoCreateInputSchema,
  type MediaAssetDto,
  type VideoCreateInput,
  type VideoDto,
} from '@roman/shared';

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { adminPrimaryButton, adminSecondaryButton } from '@/features/admin/components/adminStyles';
import { CheckboxField, SelectField, TextAreaField } from '@/features/admin/components/Fields';
import { FormAlert } from '@/features/admin/components/FormAlert';
import { FormField } from '@/features/admin/components/FormField';
import { applyFieldErrors } from '@/lib/forms';
import { MediaUploader } from '@/features/admin/components/MediaUploader';
import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { useInvalidate } from '@/features/admin/components/useAdminList';
import { adminKeys, createVideo, getVideo, updateVideo } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';
import { VIDEO_CATEGORY_LABELS } from '@/lib/labels';

type VideoCreateParsed = z.output<typeof videoCreateInputSchema>;

const FIELDS: readonly Path<VideoCreateInput>[] = [
  'title',
  'slug',
  'description',
  'source',
  'mediaRef',
  'youtube',
  'poster',
  'category',
  'recordedAt',
  'venue',
  'status',
  'featured',
];

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

function toFormValues(video: VideoDto): VideoCreateInput {
  const common = {
    title: video.title,
    slug: video.slug,
    description: video.description ?? '',
    poster: video.poster ? { alt: video.poster.alt } : null,
    category: video.category,
    recordedAt: video.recordedAt ?? '',
    venue: video.venue ?? '',
    status: video.status,
    featured: video.featured,
  };
  return video.source === 'cloudinary'
    ? {
        ...common,
        source: 'cloudinary',
        mediaRef: { publicId: video.media.publicId, resourceType: video.media.resourceType },
      }
    : { ...common, source: 'youtube', youtube: video.youtubeId };
}

const NEW_VIDEO: DefaultValues<VideoCreateInput> = {
  title: '',
  description: '',
  source: 'youtube',
  youtube: '',
  poster: null,
  category: 'performance',
  recordedAt: '',
  venue: '',
  status: 'draft',
  featured: false,
};

export function VideoEditPage() {
  const { id } = useParams();
  const editing = id !== undefined && id !== 'new';
  const video = useQuery({
    queryKey: adminKeys.video(id ?? 'new'),
    queryFn: () => getVideo(id ?? ''),
    enabled: editing,
  });

  if (editing && video.isPending) return <PageSpinner label="Loading video…" />;
  if (editing && video.isError) {
    return <FormAlert tone="error">{getErrorMessage(video.error)}</FormAlert>;
  }
  return <VideoForm key={video.data?.id ?? 'new'} video={video.data} />;
}

function VideoForm({ video }: { video: VideoDto | undefined }) {
  const navigate = useNavigate();
  const invalidate = useInvalidate(adminKeys.videos, ['videos'], queryKeys.home);
  const [fileAsset, setFileAsset] = useState<MediaAssetDto | null>(
    video?.source === 'cloudinary' ? video.media : null,
  );
  const [posterAsset, setPosterAsset] = useState<MediaAssetDto | null>(
    video?.poster?.asset ?? null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    unregister,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<VideoCreateInput, unknown, VideoCreateParsed>({
    resolver: zodResolver(videoCreateInputSchema),
    defaultValues: video ? toFormValues(video) : NEW_VIDEO,
  });
  const source = useWatch({ control, name: 'source' });

  const save = useMutation({
    mutationFn: (values: VideoCreateInput) =>
      video ? updateVideo(video.id, values) : createVideo(values),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync(values);
      toast.success(`“${saved.title}” saved`);
      await invalidate();
      await navigate('/admin/videos');
    } catch (error) {
      if (!applyFieldErrors(error, setError, FIELDS)) setFormError(getErrorMessage(error));
    }
  });

  // The schema accepts exactly one of the two, so the other source's field is removed.
  const sourceField = register('source', {
    onChange: (event: { target: { value: unknown } }) => {
      if (event.target.value === 'youtube') {
        unregister('mediaRef');
      } else {
        unregister('youtube');
        if (fileAsset) {
          setValue('mediaRef', {
            publicId: fileAsset.publicId,
            resourceType: fileAsset.resourceType,
          });
        }
      }
    },
  });

  return (
    <section className="max-w-3xl">
      <AdminPageHeader title={video ? `Edit “${video.title}”` : 'Add a video'} />
      <form noValidate className="flex flex-col gap-6" onSubmit={(event) => void onSubmit(event)}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Video</legend>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label="Where the video is">
            <label className="flex items-center gap-3 text-sm">
              <input
                type="radio"
                value="youtube"
                className="size-4 accent-amber-700"
                {...sourceField}
              />
              On YouTube (recommended for long performances)
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="radio"
                value="cloudinary"
                className="size-4 accent-amber-700"
                {...sourceField}
              />
              Upload a video file (MP4, MOV or WebM)
            </label>
          </div>

          {source === 'youtube' ? (
            <FormField
              label="YouTube link"
              hint="Paste the link from YouTube’s Share button, or the video ID."
              error={'youtube' in errors ? errors.youtube?.message : undefined}
              {...register('youtube')}
            />
          ) : (
            <>
              <MediaUploader
                kind="video"
                label="Video file (required)"
                hint="Long recordings are better on YouTube: no size limit and free streaming."
                value={fileAsset}
                onChange={(asset) => {
                  if (!asset) return;
                  setFileAsset(asset);
                  setValue(
                    'mediaRef',
                    { publicId: asset.publicId, resourceType: asset.resourceType },
                    { shouldValidate: true },
                  );
                }}
              />
              {'mediaRef' in errors && errors.mediaRef && (
                <p className="text-sm text-red-800">Upload the video file.</p>
              )}
            </>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Details</legend>
          <FormField label="Title" error={errors.title?.message} {...register('title')} />
          <FormField
            label="Address name (slug)"
            hint={video ? 'Used in links.' : 'Optional. Leave empty to create it from the title.'}
            error={errors.slug?.message}
            {...register('slug', { setValueAs: emptyToUndefined })}
          />
          <SelectField label="Category" error={errors.category?.message} {...register('category')}>
            {VIDEO_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {VIDEO_CATEGORY_LABELS[category]}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            label="Description"
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Recorded on"
              type="date"
              hint="Optional."
              error={errors.recordedAt?.message}
              {...register('recordedAt')}
            />
            <FormField
              label="Venue"
              hint="Optional."
              error={errors.venue?.message}
              {...register('venue')}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Poster image</legend>
          <MediaUploader
            kind="video-poster"
            label="Poster (optional)"
            hint="Without one, a frame from the video (or YouTube’s thumbnail) is used."
            value={posterAsset}
            removable
            onChange={(asset) => {
              setPosterAsset(asset);
              setValue(
                'poster',
                asset
                  ? {
                      mediaRef: { publicId: asset.publicId, resourceType: asset.resourceType },
                      alt: getValues('poster.alt') ?? '',
                    }
                  : null,
              );
            }}
          />
          {posterAsset && (
            <FormField
              label="Poster description (alt text)"
              error={errors.poster?.alt?.message ?? errors.poster?.message}
              {...register('poster.alt')}
            />
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Publishing</legend>
          <SelectField label="Status" error={errors.status?.message} {...register('status')}>
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published</option>
          </SelectField>
          <CheckboxField label="Feature on the home page" {...register('featured')} />
        </fieldset>

        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className={adminPrimaryButton}>
            {isSubmitting ? 'Saving…' : 'Save video'}
          </button>
          <Link to="/admin/videos" className={adminSecondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
