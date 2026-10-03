import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm, type Path } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { z } from 'zod';

import {
  GALLERY_CATEGORIES,
  galleryImageCreateInputSchema,
  type GalleryImageDto,
  type MediaAssetDto,
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
import { adminKeys, getGalleryImage, updateGalleryImage } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';
import { GALLERY_CATEGORY_LABELS } from '@/lib/labels';

// The shared create schema without the event link, which arrives with events (Phase 8).
const photoFormSchema = galleryImageCreateInputSchema.omit({ eventId: true });
type PhotoFormInput = z.input<typeof photoFormSchema>;
type PhotoFormOutput = z.output<typeof photoFormSchema>;

const FIELDS: readonly Path<PhotoFormInput>[] = [
  'image',
  'alt',
  'caption',
  'category',
  'takenAt',
  'photographerCredit',
  'status',
  'featured',
];

export function GalleryImageEditPage() {
  const { id = '' } = useParams();
  const photo = useQuery({
    queryKey: adminKeys.galleryImage(id),
    queryFn: () => getGalleryImage(id),
  });

  if (photo.isPending) return <PageSpinner label="Loading photo…" />;
  if (photo.isError) return <FormAlert tone="error">{getErrorMessage(photo.error)}</FormAlert>;
  return <PhotoForm key={photo.data.id} photo={photo.data} />;
}

function PhotoForm({ photo }: { photo: GalleryImageDto }) {
  const navigate = useNavigate();
  const invalidate = useInvalidate(adminKeys.gallery, ['gallery'], queryKeys.home);
  const [asset, setAsset] = useState<MediaAssetDto>(photo.image);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PhotoFormInput, unknown, PhotoFormOutput>({
    resolver: zodResolver(photoFormSchema),
    defaultValues: {
      image: { publicId: photo.image.publicId, resourceType: photo.image.resourceType },
      alt: photo.alt,
      caption: photo.caption ?? '',
      category: photo.category,
      takenAt: photo.takenAt ?? '',
      photographerCredit: photo.photographerCredit ?? '',
      status: photo.status,
      featured: photo.featured,
    },
  });

  const save = useMutation({
    mutationFn: (values: PhotoFormInput) => updateGalleryImage(photo.id, values),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await save.mutateAsync(values);
      toast.success('Photo saved');
      await invalidate();
      await navigate('/admin/gallery');
    } catch (error) {
      if (!applyFieldErrors(error, setError, FIELDS)) setFormError(getErrorMessage(error));
    }
  });

  return (
    <section className="max-w-3xl">
      <AdminPageHeader title="Edit photo" />
      <form noValidate className="flex flex-col gap-6" onSubmit={(event) => void onSubmit(event)}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        <MediaUploader
          kind="gallery"
          label="Image"
          hint="Upload a new file to replace this photo."
          value={asset}
          onChange={(next) => {
            if (!next) return;
            setAsset(next);
            setValue('image', { publicId: next.publicId, resourceType: next.resourceType });
          }}
        />
        <TextAreaField
          label="Description (alt text, required)"
          hint="Describe what the photo shows for people who can’t see it, e.g. “Roman playing violin on a dimly lit stage”. 5–250 characters."
          rows={2}
          error={errors.alt?.message}
          {...register('alt')}
        />
        <SelectField label="Category" error={errors.category?.message} {...register('category')}>
          {GALLERY_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {GALLERY_CATEGORY_LABELS[category]}
            </option>
          ))}
        </SelectField>
        <FormField
          label="Caption"
          hint="Optional. Shown under the photo."
          error={errors.caption?.message}
          {...register('caption')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Photographer"
            hint="Optional, shown as “Photo: …”."
            error={errors.photographerCredit?.message}
            {...register('photographerCredit')}
          />
          <FormField
            label="Taken on"
            type="date"
            hint="Optional."
            error={errors.takenAt?.message}
            {...register('takenAt')}
          />
        </div>
        <SelectField label="Status" error={errors.status?.message} {...register('status')}>
          <option value="draft">Draft (hidden)</option>
          <option value="published">Published</option>
        </SelectField>
        <CheckboxField label="Feature on the home page" {...register('featured')} />

        <div className="flex gap-3">
          <button type="submit" disabled={isSubmitting} className={adminPrimaryButton}>
            {isSubmitting ? 'Saving…' : 'Save photo'}
          </button>
          <Link to="/admin/gallery" className={adminSecondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
