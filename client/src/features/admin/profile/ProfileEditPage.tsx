import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  profileInputSchema,
  type MediaAssetDto,
  type ProfileAdminDto,
  type ProfileInput,
} from '@roman/shared';

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { adminPrimaryButton } from '@/features/admin/components/adminStyles';
import { CheckboxField, TextAreaField } from '@/features/admin/components/Fields';
import { FormAlert } from '@/features/admin/components/FormAlert';
import { FormField } from '@/features/admin/components/FormField';
import { LinesField } from '@/features/admin/components/LinesField';
import { MediaUploader } from '@/features/admin/components/MediaUploader';
import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { useInvalidate } from '@/features/admin/components/useAdminList';
import { useUnsavedChanges } from '@/features/admin/components/useUnsavedChanges';
import { adminKeys, getAdminProfile, saveProfile } from '@/lib/api/admin';
import { ApiClientError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';
import { applyFieldErrors } from '@/lib/forms';

import {
  AchievementsSection,
  AffiliationsSection,
  BiographySection,
  EducationSection,
  ExperienceSection,
  SocialsSection,
} from './ProfileListSections';
import {
  EMPTY_PROFILE,
  IMAGE_SLOTS,
  PROFILE_FIELDS,
  toFormValues,
  type ImageSlot,
  type ProfileParsed,
} from './profileForm';

const SECTIONS = [
  { id: 'identity', label: 'Identity' },
  { id: 'biography', label: 'Biography' },
  { id: 'education', label: 'Education' },
  { id: 'experience', label: 'Experience' },
  { id: 'achievements', label: 'Achievements' },
  { id: 'philosophy', label: 'Philosophy & skills' },
  { id: 'affiliations', label: 'Affiliations' },
  { id: 'contact', label: 'Contact' },
  { id: 'socials', label: 'Social links' },
  { id: 'images', label: 'Images' },
  { id: 'seo', label: 'Search & sharing' },
] as const;

const IMAGE_TEXT: Record<ImageSlot, { label: string; hint: string }> = {
  portrait: {
    label: 'Portrait',
    hint: 'Shown on the home page next to the introduction and at the top of the About page.',
  },
  heroDesktop: {
    label: 'Home page hero (wide screens)',
    hint: 'The large image at the top of the home page. Use a landscape photo.',
  },
  heroMobile: {
    label: 'Home page hero (phones, optional)',
    hint: 'A portrait-orientation crop for small screens. Without it, the wide image is used.',
  },
  ogImage: {
    label: 'Link preview image (optional)',
    hint: 'Shown when a page of the site is shared on social media (from the next deploy). Without it, the wide hero image is used. Ideally 1200 × 630 pixels.',
  },
};

function profileAssets(
  profile: ProfileAdminDto | undefined,
): Record<ImageSlot, MediaAssetDto | null> {
  return {
    portrait: profile?.portrait?.asset ?? null,
    heroDesktop: profile?.heroDesktop?.asset ?? null,
    heroMobile: profile?.heroMobile?.asset ?? null,
    ogImage: profile?.ogImage?.asset ?? null,
  };
}

/** Everything on the About, Home and Contact pages that comes from the profile (plan §13). */
export function ProfileEditPage() {
  const profile = useQuery({ queryKey: adminKeys.profile, queryFn: getAdminProfile });
  // 404 means the profile hasn't been created yet; the form then starts empty and PUT creates it.
  const missing = profile.error instanceof ApiClientError && profile.error.status === 404;

  if (profile.isPending) return <PageSpinner label="Loading profile…" />;
  if (profile.isError && !missing) {
    return <FormAlert tone="error">{getErrorMessage(profile.error)}</FormAlert>;
  }
  return <ProfileForm profile={profile.data} />;
}

function ProfileForm({ profile }: { profile: ProfileAdminDto | undefined }) {
  const invalidate = useInvalidate(adminKeys.profile, queryKeys.profile, queryKeys.home);
  const [assets, setAssets] = useState(() => profileAssets(profile));
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ProfileInput, unknown, ProfileParsed>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: profile ? toFormValues(profile) : EMPTY_PROFILE,
  });
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = form;
  const unsavedPrompt = useUnsavedChanges(isDirty);

  const save = useMutation({ mutationFn: saveProfile });

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        const saved = await save.mutateAsync(values);
        reset(toFormValues(saved));
        setAssets(profileAssets(saved));
        toast.success('Profile saved');
        await invalidate();
      } catch (error) {
        if (!applyFieldErrors(error, setError, PROFILE_FIELDS)) {
          setFormError(getErrorMessage(error));
        }
      }
    },
    () => {
      setFormError('Some fields need attention. They are marked below.');
    },
  );

  function changeImage(slot: ImageSlot, asset: MediaAssetDto | null) {
    setAssets((current) => ({ ...current, [slot]: asset }));
    setValue(
      slot,
      asset
        ? {
            mediaRef: { publicId: asset.publicId, resourceType: asset.resourceType },
            alt: getValues(`${slot}.alt`) ?? '',
          }
        : null,
      { shouldDirty: true },
    );
  }

  return (
    <section className="max-w-3xl">
      <AdminPageHeader title="Profile" />
      <nav aria-label="Profile sections" className="mb-8">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="underline underline-offset-4">
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <FormProvider {...form}>
        <form
          noValidate
          className="flex flex-col gap-12"
          onSubmit={(event) => void onSubmit(event)}
        >
          {formError && <FormAlert tone="error">{formError}</FormAlert>}

          <fieldset id="identity" className="flex scroll-mt-6 flex-col gap-4">
            <legend className="mb-2 text-lg font-semibold">Identity</legend>
            <FormField
              label="Name"
              error={errors.displayName?.message}
              {...register('displayName')}
            />
            <FormField
              label="Tagline"
              hint="One line under the name, e.g. “Violinist · Educator”."
              error={errors.tagline?.message}
              {...register('tagline')}
            />
            <TextAreaField
              label="Short introduction"
              hint="A few sentences for the home page."
              rows={4}
              error={errors.shortBio?.message}
              {...register('shortBio')}
            />
          </fieldset>

          <BiographySection />
          <EducationSection />
          <ExperienceSection />
          <AchievementsSection />

          <fieldset id="philosophy" className="flex scroll-mt-6 flex-col gap-4">
            <legend className="mb-2 text-lg font-semibold">Philosophy & skills</legend>
            <TextAreaField
              label="Musical philosophy (optional)"
              hint="Separate paragraphs with a blank line. Hidden on the About page while empty."
              rows={6}
              error={errors.philosophy?.message}
              {...register('philosophy')}
            />
            <Controller
              control={control}
              name="skills"
              render={({ field, fieldState }) => (
                <LinesField
                  label="Skills"
                  hint="One per line, up to 30."
                  rows={6}
                  error={
                    fieldState.error?.message ??
                    errors.skills?.find?.((item) => item?.message)?.message
                  }
                  {...field}
                />
              )}
            />
          </fieldset>

          <AffiliationsSection />

          <fieldset id="contact" className="flex scroll-mt-6 flex-col gap-4">
            <legend className="mb-2 text-lg font-semibold">Contact</legend>
            <FormField
              label="Public email (optional)"
              type="email"
              hint="Shown on the Contact page."
              error={errors.contact?.publicEmail?.message}
              {...register('contact.publicEmail')}
            />
            <FormField
              label="Phone (optional)"
              type="tel"
              error={errors.contact?.phone?.message}
              {...register('contact.phone')}
            />
            <CheckboxField
              label="Show the phone number on the Contact page"
              hint="When unticked, the number is kept here but never sent to visitors."
              {...register('contact.showPhone')}
            />
            <FormField
              label="Based in (optional)"
              hint="For example “Kathmandu, Nepal”."
              error={errors.contact?.location?.message}
              {...register('contact.location')}
            />
          </fieldset>

          <SocialsSection />

          <fieldset id="images" className="flex scroll-mt-6 flex-col gap-8">
            <legend className="mb-2 text-lg font-semibold">Images</legend>
            {IMAGE_SLOTS.map((slot) => (
              <div key={slot} className="flex flex-col gap-4">
                <MediaUploader
                  kind="profile"
                  label={IMAGE_TEXT[slot].label}
                  hint={IMAGE_TEXT[slot].hint}
                  value={assets[slot]}
                  removable
                  onChange={(asset) => {
                    changeImage(slot, asset);
                  }}
                />
                {assets[slot] && (
                  <FormField
                    label={`${IMAGE_TEXT[slot].label}: description (alt text)`}
                    hint="Describe what the image shows for people who can’t see it."
                    error={errors[slot]?.alt?.message ?? errors[slot]?.message}
                    {...register(`${slot}.alt`)}
                  />
                )}
              </div>
            ))}
          </fieldset>

          <fieldset id="seo" className="flex scroll-mt-6 flex-col gap-4">
            <legend className="mb-2 text-lg font-semibold">Search & sharing</legend>
            <p className="-mt-2 text-sm text-stone-600">
              Optional. They replace the home page’s title and description in search results and
              link previews. The site uses them straight away; link previews on WhatsApp, Facebook
              and similar apps update after the next deploy.
            </p>
            <FormField
              label="Title for search results (optional)"
              hint="Up to 70 characters."
              error={errors.seo?.metaTitle?.message}
              {...register('seo.metaTitle')}
            />
            <TextAreaField
              label="Description for search results (optional)"
              hint="Up to 170 characters."
              rows={3}
              error={errors.seo?.metaDescription?.message}
              {...register('seo.metaDescription')}
            />
          </fieldset>

          <div className="sticky bottom-0 -mx-6 flex flex-wrap items-center gap-4 border-t border-stone-200 bg-stone-100/95 px-6 py-4 backdrop-blur">
            <button type="submit" disabled={isSubmitting} className={adminPrimaryButton}>
              {isSubmitting ? 'Saving…' : 'Save profile'}
            </button>
            <p role="status" className="text-sm text-stone-600">
              {isDirty ? 'You have unsaved changes.' : 'No unsaved changes.'}
            </p>
          </div>
        </form>
      </FormProvider>
      {unsavedPrompt}
    </section>
  );
}
