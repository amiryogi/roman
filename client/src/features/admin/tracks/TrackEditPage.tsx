import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type DefaultValues, type Path } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { z } from 'zod';

import {
  DEFAULT_ARTIST_CREDIT,
  trackCreateInputSchema,
  type MediaAssetDto,
  type TrackCreateInput,
  type TrackDto,
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
import { SAVED_STATE, useUnsavedChanges } from '@/features/admin/components/useUnsavedChanges';
import { adminKeys, createTrack, getTrack, listAlbums, updateTrack } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';

type TrackCreateParsed = z.output<typeof trackCreateInputSchema>;

const FIELDS: readonly Path<TrackCreateInput>[] = [
  'title',
  'slug',
  'albumId',
  'trackNumber',
  'artistCredit',
  'credits',
  'description',
  'audio',
  'cover',
  'year',
  'tags',
  'status',
  'featured',
];

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
const emptyToNull = (value: unknown) => (value === '' ? null : value);
const toNumberOrNull = (value: unknown) =>
  value === '' || value === null || value === undefined ? null : Number(value);
const toTags = (value: unknown) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
    : value;

function toFormValues(track: TrackDto): TrackCreateInput {
  return {
    title: track.title,
    slug: track.slug,
    albumId: track.album?.id ?? null,
    trackNumber: track.trackNumber ?? null,
    artistCredit: track.artistCredit,
    credits: track.credits ?? '',
    description: track.description ?? '',
    audio: { publicId: track.audio.publicId, resourceType: track.audio.resourceType },
    cover: track.cover ? { alt: track.cover.alt } : null,
    year: track.year ?? null,
    tags: track.tags,
    status: track.status,
    featured: track.featured,
  };
}

const NEW_TRACK: DefaultValues<TrackCreateInput> = {
  title: '',
  albumId: null,
  trackNumber: null,
  artistCredit: DEFAULT_ARTIST_CREDIT,
  credits: '',
  description: '',
  cover: null,
  year: null,
  tags: [],
  status: 'draft',
  featured: false,
};

/** Create and edit a track (plan §13): one hand-written form, validated by the shared schema. */
export function TrackEditPage() {
  const { id } = useParams();
  const editing = id !== undefined && id !== 'new';
  const track = useQuery({
    queryKey: adminKeys.track(id ?? 'new'),
    queryFn: () => getTrack(id ?? ''),
    enabled: editing,
  });

  if (editing && track.isPending) return <PageSpinner label="Loading track…" />;
  if (editing && track.isError) {
    return <FormAlert tone="error">{getErrorMessage(track.error)}</FormAlert>;
  }
  return <TrackForm key={track.data?.id ?? 'new'} track={track.data} />;
}

function TrackForm({ track }: { track: TrackDto | undefined }) {
  const navigate = useNavigate();
  const invalidate = useInvalidate(
    adminKeys.tracks,
    adminKeys.albums,
    queryKeys.tracks,
    queryKeys.albums,
    queryKeys.home,
  );
  const albums = useQuery({
    queryKey: adminKeys.albumList({ page: 1 }),
    queryFn: () => listAlbums({ page: 1 }),
  });
  const [audioAsset, setAudioAsset] = useState<MediaAssetDto | null>(track?.audio ?? null);
  const [coverAsset, setCoverAsset] = useState<MediaAssetDto | null>(track?.cover?.asset ?? null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TrackCreateInput, unknown, TrackCreateParsed>({
    resolver: zodResolver(trackCreateInputSchema),
    defaultValues: track ? toFormValues(track) : NEW_TRACK,
  });

  const save = useMutation({
    mutationFn: (values: TrackCreateInput) =>
      track ? updateTrack(track.id, values) : createTrack(values),
  });

  const unsavedPrompt = useUnsavedChanges(isDirty);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync(values);
      toast.success(`“${saved.title}” saved`);
      await invalidate();
      await navigate('/admin/tracks', { state: SAVED_STATE });
    } catch (error) {
      if (!applyFieldErrors(error, setError, FIELDS)) setFormError(getErrorMessage(error));
    }
  });

  return (
    <section className="max-w-3xl">
      <AdminPageHeader title={track ? `Edit “${track.title}”` : 'Add a track'} />
      <form noValidate className="flex flex-col gap-6" onSubmit={(event) => void onSubmit(event)}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Recording</legend>
          <MediaUploader
            kind="track-audio"
            label="Audio file (required)"
            hint="MP3, WAV, M4A, AAC, FLAC or OGG. The length is read from the file."
            value={audioAsset}
            onChange={(asset) => {
              // Audio can be replaced but not removed, so there is always a file once uploaded.
              if (!asset) return;
              setAudioAsset(asset);
              setValue(
                'audio',
                { publicId: asset.publicId, resourceType: asset.resourceType },
                { shouldDirty: true, shouldValidate: true },
              );
            }}
          />
          {errors.audio && (
            <p className="text-sm text-red-800">Upload the audio file for this track.</p>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Details</legend>
          <FormField label="Title" error={errors.title?.message} {...register('title')} />
          <FormField
            label="Address name (slug)"
            hint={
              track
                ? 'Used in links. Changing it breaks links that were shared before.'
                : 'Optional. Leave empty to create it from the title.'
            }
            error={errors.slug?.message}
            {...register('slug', { setValueAs: emptyToUndefined })}
          />
          <FormField
            label="Artist credit"
            error={errors.artistCredit?.message}
            {...register('artistCredit')}
          />
          <TextAreaField
            label="Credits"
            hint="Composer, arranger and collaborators, as you want them shown."
            rows={2}
            error={errors.credits?.message}
            {...register('credits')}
          />
          <TextAreaField
            label="Description"
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <SelectField
              label="Album"
              error={errors.albumId?.message}
              {...register('albumId', { setValueAs: emptyToNull })}
            >
              <option value="">No album</option>
              {albums.data?.items.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.title}
                </option>
              ))}
            </SelectField>
            <FormField
              label="Track number"
              type="number"
              min={1}
              error={errors.trackNumber?.message}
              {...register('trackNumber', { setValueAs: toNumberOrNull })}
            />
            <FormField
              label="Year"
              type="number"
              min={1900}
              max={2100}
              error={errors.year?.message}
              {...register('year', { setValueAs: toNumberOrNull })}
            />
          </div>
          <FormField
            label="Tags"
            hint="Optional, separated by commas, e.g. folk, film."
            error={errors.tags?.message ?? errors.tags?.[0]?.message}
            {...register('tags', { setValueAs: toTags })}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Cover image</legend>
          <MediaUploader
            kind="track-cover"
            label="Cover (optional)"
            hint="Without a cover, the album cover is used."
            value={coverAsset}
            removable
            onChange={(asset) => {
              setCoverAsset(asset);
              setValue(
                'cover',
                asset
                  ? {
                      mediaRef: { publicId: asset.publicId, resourceType: asset.resourceType },
                      alt: getValues('cover.alt') ?? '',
                    }
                  : null,
                { shouldDirty: true },
              );
            }}
          />
          {coverAsset && (
            <FormField
              label="Cover description (alt text)"
              hint="Describe what the image shows, e.g. “Violin on a dark stage”."
              error={errors.cover?.alt?.message ?? errors.cover?.message}
              {...register('cover.alt')}
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
            {isSubmitting ? 'Saving…' : 'Save track'}
          </button>
          <Link to="/admin/tracks" className={adminSecondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
      {unsavedPrompt}
    </section>
  );
}
