import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type DefaultValues, type Path } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { z } from 'zod';

import {
  SHEET_MUSIC_LEVELS,
  sheetMusicCreateInputSchema,
  type MediaAssetDto,
  type SheetMusicCreateInput,
  type SheetMusicDto,
} from '@roman/shared';

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { adminPrimaryButton, adminSecondaryButton } from '@/features/admin/components/adminStyles';
import { CheckboxField, SelectField, TextAreaField } from '@/features/admin/components/Fields';
import { FormAlert } from '@/features/admin/components/FormAlert';
import { FormField } from '@/features/admin/components/FormField';
import { MediaUploader } from '@/features/admin/components/MediaUploader';
import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { useInvalidate } from '@/features/admin/components/useAdminList';
import { SAVED_STATE, useUnsavedChanges } from '@/features/admin/components/useUnsavedChanges';
import { adminKeys, createSheetMusic, getSheetMusic, updateSheetMusic } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';
import { applyFieldErrors } from '@/lib/forms';
import { SHEET_MUSIC_LEVEL_LABELS } from '@/lib/labels';

type SheetMusicParsed = z.output<typeof sheetMusicCreateInputSchema>;

const FIELDS: readonly Path<SheetMusicCreateInput>[] = [
  'title',
  'slug',
  'artist',
  'description',
  'level',
  'preview',
  'externalUrl',
  'status',
  'featured',
];

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);
/** The level select's "not set" option posts '', which means "no level". */
const emptyToNull = (value: unknown) => (value === '' ? null : value);

function toFormValues(score: SheetMusicDto): SheetMusicCreateInput {
  return {
    title: score.title,
    slug: score.slug,
    artist: score.artist ?? '',
    description: score.description ?? '',
    level: score.level ?? null,
    preview: score.preview ? { alt: score.preview.alt } : null,
    externalUrl: score.externalUrl ?? '',
    status: score.status,
    featured: score.featured,
  };
}

const NEW_SCORE: DefaultValues<SheetMusicCreateInput> = {
  title: '',
  artist: '',
  description: '',
  level: null,
  preview: null,
  externalUrl: '',
  status: 'draft',
  featured: false,
};

export function SheetMusicEditPage() {
  const { id } = useParams();
  const editing = id !== undefined && id !== 'new';
  const score = useQuery({
    queryKey: adminKeys.score(id ?? 'new'),
    queryFn: () => getSheetMusic(id ?? ''),
    enabled: editing,
  });

  if (editing && score.isPending) return <PageSpinner label="Loading score…" />;
  if (editing && score.isError) {
    return <FormAlert tone="error">{getErrorMessage(score.error)}</FormAlert>;
  }
  return <SheetMusicForm key={score.data?.id ?? 'new'} score={score.data} />;
}

function SheetMusicForm({ score }: { score: SheetMusicDto | undefined }) {
  const navigate = useNavigate();
  const invalidate = useInvalidate(adminKeys.sheetMusic, queryKeys.sheetMusic, queryKeys.home);
  const [previewAsset, setPreviewAsset] = useState<MediaAssetDto | null>(
    score?.preview?.asset ?? null,
  );
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<SheetMusicCreateInput, unknown, SheetMusicParsed>({
    resolver: zodResolver(sheetMusicCreateInputSchema),
    defaultValues: score ? toFormValues(score) : NEW_SCORE,
  });

  const save = useMutation({
    mutationFn: (values: SheetMusicCreateInput) =>
      score ? updateSheetMusic(score.id, values) : createSheetMusic(values),
  });

  const unsavedPrompt = useUnsavedChanges(isDirty);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync(values);
      toast.success(`“${saved.title}” saved`);
      await invalidate();
      await navigate('/admin/sheet-music', { state: SAVED_STATE });
    } catch (error) {
      if (!applyFieldErrors(error, setError, FIELDS)) setFormError(getErrorMessage(error));
    }
  });

  return (
    <section className="max-w-3xl">
      <AdminPageHeader title={score ? `Edit “${score.title}”` : 'Add a score'} />
      <form noValidate className="flex flex-col gap-6" onSubmit={(event) => void onSubmit(event)}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Details</legend>
          <FormField label="Song title" error={errors.title?.message} {...register('title')} />
          <FormField
            label="Address name (slug)"
            hint={score ? 'Used in links.' : 'Optional. Leave empty to create it from the title.'}
            error={errors.slug?.message}
            {...register('slug', { setValueAs: emptyToUndefined })}
          />
          <FormField
            label="Artist or composer (optional)"
            hint="Whose song it is, e.g. the original singer."
            error={errors.artist?.message}
            {...register('artist')}
          />
          <SelectField
            label="Level (optional)"
            error={errors.level?.message}
            {...register('level', { setValueAs: emptyToNull })}
          >
            <option value="">Not set</option>
            {SHEET_MUSIC_LEVELS.map((level) => (
              <option key={level} value={level}>
                {SHEET_MUSIC_LEVEL_LABELS[level]}
              </option>
            ))}
          </SelectField>
          <TextAreaField
            label="Description (optional)"
            hint="For example the arrangement, the key, or what the PDF includes."
            error={errors.description?.message}
            {...register('description')}
          />
          <FormField
            label="Store link (optional)"
            type="url"
            inputMode="url"
            placeholder="https://"
            hint="If the score is sold elsewhere. Without it, visitors ask for it through the contact form."
            error={errors.externalUrl?.message}
            {...register('externalUrl')}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Preview image</legend>
          <MediaUploader
            kind="sheet-music"
            label="Preview (optional)"
            hint="A picture of the first lines of the score, so visitors can see what they get."
            value={previewAsset}
            removable
            onChange={(asset) => {
              setPreviewAsset(asset);
              setValue(
                'preview',
                asset
                  ? {
                      mediaRef: { publicId: asset.publicId, resourceType: asset.resourceType },
                      alt: getValues('preview.alt') ?? '',
                    }
                  : null,
                { shouldDirty: true },
              );
            }}
          />
          {previewAsset && (
            <FormField
              label="Preview description (alt text)"
              hint="For example “The opening bars of the violin part”."
              error={errors.preview?.alt?.message ?? errors.preview?.message}
              {...register('preview.alt')}
            />
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
            {isSubmitting ? 'Saving…' : 'Save score'}
          </button>
          <Link to="/admin/sheet-music" className={adminSecondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
      {unsavedPrompt}
    </section>
  );
}
