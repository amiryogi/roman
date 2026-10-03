import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useFieldArray, useForm, type DefaultValues, type Path } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { z } from 'zod';

import {
  albumCreateInputSchema,
  type AlbumCreateInput,
  type AlbumDto,
  type MediaAssetDto,
} from '@roman/shared';

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import {
  adminPrimaryButton,
  adminSecondaryButton,
  adminSmallButton,
} from '@/features/admin/components/adminStyles';
import { CheckboxField, SelectField, TextAreaField } from '@/features/admin/components/Fields';
import { FormAlert } from '@/features/admin/components/FormAlert';
import { FormField } from '@/features/admin/components/FormField';
import { applyFieldErrors } from '@/features/admin/components/formErrors';
import { MediaUploader } from '@/features/admin/components/MediaUploader';
import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { useInvalidate } from '@/features/admin/components/useAdminList';
import { adminKeys, createAlbum, getAlbum, updateAlbum } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';

type AlbumCreateParsed = z.output<typeof albumCreateInputSchema>;

const FIELDS: readonly Path<AlbumCreateInput>[] = [
  'title',
  'slug',
  'description',
  'releaseDate',
  'cover',
  'externalLinks',
  'status',
  'featured',
];

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

function toFormValues(album: AlbumDto): AlbumCreateInput {
  return {
    title: album.title,
    slug: album.slug,
    description: album.description ?? '',
    releaseDate: album.releaseDate ?? '',
    cover: album.cover ? { alt: album.cover.alt } : null,
    externalLinks: album.externalLinks,
    status: album.status,
    featured: album.featured,
  };
}

const NEW_ALBUM: DefaultValues<AlbumCreateInput> = {
  title: '',
  description: '',
  releaseDate: '',
  cover: null,
  externalLinks: [],
  status: 'draft',
  featured: false,
};

export function AlbumEditPage() {
  const { id } = useParams();
  const editing = id !== undefined && id !== 'new';
  const album = useQuery({
    queryKey: adminKeys.album(id ?? 'new'),
    queryFn: () => getAlbum(id ?? ''),
    enabled: editing,
  });

  if (editing && album.isPending) return <PageSpinner label="Loading album…" />;
  if (editing && album.isError) {
    return <FormAlert tone="error">{getErrorMessage(album.error)}</FormAlert>;
  }
  return <AlbumForm key={album.data?.id ?? 'new'} album={album.data} />;
}

function AlbumForm({ album }: { album: AlbumDto | undefined }) {
  const navigate = useNavigate();
  const invalidate = useInvalidate(
    adminKeys.albums,
    adminKeys.tracks,
    queryKeys.albums,
    queryKeys.tracks,
    queryKeys.home,
  );
  const [coverAsset, setCoverAsset] = useState<MediaAssetDto | null>(album?.cover?.asset ?? null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AlbumCreateInput, unknown, AlbumCreateParsed>({
    resolver: zodResolver(albumCreateInputSchema),
    defaultValues: album ? toFormValues(album) : NEW_ALBUM,
  });
  const links = useFieldArray({ control, name: 'externalLinks' });

  const save = useMutation({
    mutationFn: (values: AlbumCreateInput) =>
      album ? updateAlbum(album.id, values) : createAlbum(values),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync(values);
      toast.success(`“${saved.title}” saved`);
      await invalidate();
      await navigate('/admin/albums');
    } catch (error) {
      if (!applyFieldErrors(error, setError, FIELDS)) setFormError(getErrorMessage(error));
    }
  });

  return (
    <section className="max-w-3xl">
      <AdminPageHeader title={album ? `Edit “${album.title}”` : 'Add an album'} />
      <form noValidate className="flex flex-col gap-6" onSubmit={(event) => void onSubmit(event)}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Details</legend>
          <FormField label="Title" error={errors.title?.message} {...register('title')} />
          <FormField
            label="Address name (slug)"
            hint={album ? 'Used in links.' : 'Optional. Leave empty to create it from the title.'}
            error={errors.slug?.message}
            {...register('slug', { setValueAs: emptyToUndefined })}
          />
          <TextAreaField
            label="Description"
            error={errors.description?.message}
            {...register('description')}
          />
          <FormField
            label="Release date"
            type="date"
            hint="Optional."
            error={errors.releaseDate?.message}
            {...register('releaseDate')}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Cover image</legend>
          <MediaUploader
            kind="album-cover"
            label="Cover (optional)"
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
              );
            }}
          />
          {coverAsset && (
            <FormField
              label="Cover description (alt text)"
              hint="Describe what the artwork shows."
              error={errors.cover?.alt?.message ?? errors.cover?.message}
              {...register('cover.alt')}
            />
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Listen elsewhere</legend>
          <p className="text-sm text-stone-600">
            Optional links to streaming services, e.g. Spotify or YouTube Music. Must start with
            https://.
          </p>
          {links.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-sm border border-stone-200 bg-white p-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end"
            >
              <FormField
                label={`Link ${String(index + 1)} label`}
                error={errors.externalLinks?.[index]?.label?.message}
                {...register(`externalLinks.${index}.label`)}
              />
              <FormField
                label={`Link ${String(index + 1)} address`}
                type="url"
                error={errors.externalLinks?.[index]?.url?.message}
                {...register(`externalLinks.${index}.url`)}
              />
              <button
                type="button"
                onClick={() => {
                  links.remove(index);
                }}
                className={adminSmallButton}
              >
                Remove<span className="sr-only"> link {index + 1}</span>
              </button>
            </div>
          ))}
          {links.fields.length < 10 && (
            <button
              type="button"
              onClick={() => {
                links.append({ label: '', url: '' });
              }}
              className={`${adminSecondaryButton} self-start`}
            >
              Add a link
            </button>
          )}
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Publishing</legend>
          <SelectField label="Status" error={errors.status?.message} {...register('status')}>
            <option value="draft">Draft (hidden)</option>
            <option value="published">Published</option>
          </SelectField>
          <CheckboxField label="Featured" {...register('featured')} />
        </fieldset>

        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className={adminPrimaryButton}>
            {isSubmitting ? 'Saving…' : 'Save album'}
          </button>
          <Link to="/admin/albums" className={adminSecondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
