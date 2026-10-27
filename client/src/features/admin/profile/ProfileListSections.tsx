import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';

import {
  EXPERIENCE_CATEGORIES,
  INQUIRY_TYPES,
  SOCIAL_PLATFORMS,
  type ProfileInput,
} from '@roman/shared';

import { adminSecondaryButton, adminSmallButton } from '@/features/admin/components/adminStyles';
import { SelectField, TextAreaField } from '@/features/admin/components/Fields';
import { FormField } from '@/features/admin/components/FormField';
import { LinesField } from '@/features/admin/components/LinesField';
import { RepeatableList } from '@/features/admin/components/RepeatableList';
import {
  EXPERIENCE_CATEGORY_LABELS,
  INQUIRY_TYPE_LABELS,
  SOCIAL_PLATFORM_LABELS,
} from '@/lib/labels';

import type { ProfileParsed } from './profileForm';

// The repeatable profile sections (plan §13 profile editor). Limits match the shared schema.

function useProfileForm() {
  return useFormContext<ProfileInput, unknown, ProfileParsed>();
}

/** A list-level error, e.g. too many items. */
function listError(error: { message?: string; root?: { message?: string } } | undefined) {
  return error?.message ?? error?.root?.message;
}

export function StatsSection() {
  const { control, register, formState } = useProfileForm();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'stats' });
  const errors = formState.errors.stats;

  return (
    <RepeatableList
      id="stats"
      legend="Stats"
      hint="Up to four figures in a row under the home page photo, e.g. “15+ years” / “as a professional violinist”. Hidden while empty."
      keys={fields.map((field) => field.id)}
      max={4}
      itemLabel={(index) => `Stat ${String(index + 1)}`}
      addLabel="Add stat"
      emptyMessage="No stats yet."
      error={listError(errors)}
      onAdd={() => {
        append({ value: '', label: '' });
      }}
      onRemove={remove}
      onMove={move}
      renderItem={(index) => (
        <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
          <FormField
            label="Figure"
            hint="Up to 20 characters."
            error={errors?.[index]?.value?.message}
            {...register(`stats.${index}.value`)}
          />
          <FormField
            label="What it counts"
            hint="Up to 60 characters."
            error={errors?.[index]?.label?.message}
            {...register(`stats.${index}.label`)}
          />
        </div>
      )}
    />
  );
}

export function ServicesSection() {
  const { control, register, formState } = useProfileForm();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'services' });
  const errors = formState.errors.services;

  return (
    <RepeatableList
      id="services"
      legend="What I do"
      hint="Cards on the home page, one at a time (up to six), e.g. Violinist, Performer, Educator. Hidden while empty."
      keys={fields.map((field) => field.id)}
      max={6}
      itemLabel={(index) => `Card ${String(index + 1)}`}
      addLabel="Add card"
      emptyMessage="No cards yet."
      error={listError(errors)}
      onAdd={() => {
        append({ title: '', kicker: '', summary: '', details: [] });
      }}
      onRemove={remove}
      onMove={move}
      renderItem={(index) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Title"
              hint="For example “Performer”."
              error={errors?.[index]?.title?.message}
              {...register(`services.${index}.title`)}
            />
            <FormField
              label="Small heading (optional)"
              hint="For example “On stage”."
              error={errors?.[index]?.kicker?.message}
              {...register(`services.${index}.kicker`)}
            />
          </div>
          <TextAreaField
            label="Summary"
            hint="One or two sentences, up to 300 characters."
            rows={3}
            error={errors?.[index]?.summary?.message}
            {...register(`services.${index}.summary`)}
          />
          <ServiceDetails index={index} />
          <ServiceButton index={index} />
        </>
      )}
    />
  );
}

/** The card's short facts, e.g. Where: “Weddings, concerts, events”. */
function ServiceDetails({ index }: { index: number }) {
  const { control, register, formState } = useProfileForm();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `services.${index}.details`,
  });
  const errors = formState.errors.services?.[index]?.details;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-stone-800">
        Details (optional, up to four)
        <span className="block font-normal text-stone-600">
          Short facts, e.g. “Where” – “Weddings, concerts, events”.
        </span>
      </p>
      {fields.map((field, row) => (
        <div
          key={field.id}
          className="grid gap-3 sm:grid-cols-[10rem_1fr_auto] sm:items-end"
          aria-label={`Detail ${String(row + 1)}`}
          role="group"
        >
          <FormField
            label={`Detail ${String(row + 1)} name`}
            error={errors?.[row]?.label?.message}
            {...register(`services.${index}.details.${row}.label`)}
          />
          <FormField
            label={`Detail ${String(row + 1)} text`}
            error={errors?.[row]?.value?.message}
            {...register(`services.${index}.details.${row}.value`)}
          />
          <button
            type="button"
            onClick={() => {
              remove(row);
            }}
            className={adminSmallButton}
          >
            Remove<span className="sr-only"> detail {row + 1}</span>
          </button>
        </div>
      ))}
      {fields.length < 4 && (
        <button
          type="button"
          onClick={() => {
            append({ label: '', value: '' });
          }}
          className={`${adminSecondaryButton} self-start`}
        >
          Add detail
        </button>
      )}
    </div>
  );
}

/** An optional button that opens the contact form with an enquiry type already chosen. */
function ServiceButton({ index }: { index: number }) {
  const { control, register, setValue, unregister, formState } = useProfileForm();
  const cta = useWatch({ control, name: `services.${index}.cta` });
  const errors = formState.errors.services?.[index]?.cta;

  if (!cta) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(
            `services.${index}.cta`,
            { label: 'Send a request', inquiryType: 'booking' },
            { shouldDirty: true },
          );
        }}
        className={`${adminSecondaryButton} self-start`}
      >
        Add a button to the contact form
      </button>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <FormField
        label="Button text"
        error={errors?.label?.message}
        {...register(`services.${index}.cta.label`)}
      />
      <SelectField
        label="Enquiry type it chooses"
        error={errors?.inquiryType?.message}
        {...register(`services.${index}.cta.inquiryType`)}
      >
        {INQUIRY_TYPES.map((type) => (
          <option key={type} value={type}>
            {INQUIRY_TYPE_LABELS[type]}
          </option>
        ))}
      </SelectField>
      <button
        type="button"
        onClick={() => {
          unregister(`services.${index}.cta`);
          setValue(`services.${index}.cta`, undefined, { shouldDirty: true });
        }}
        className={adminSmallButton}
      >
        Remove button
      </button>
    </div>
  );
}

export function BiographySection() {
  const { control, register, formState } = useProfileForm();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'biography' });
  const errors = formState.errors.biography;

  return (
    <RepeatableList
      id="biography"
      legend="Biography"
      hint="The About page shows these paragraphs in order. A heading is optional."
      keys={fields.map((field) => field.id)}
      max={20}
      itemLabel={(index) => `Paragraph ${String(index + 1)}`}
      addLabel="Add paragraph"
      emptyMessage="No biography paragraphs yet."
      error={listError(errors)}
      onAdd={() => {
        append({ heading: '', body: '' });
      }}
      onRemove={remove}
      onMove={move}
      renderItem={(index) => (
        <>
          <FormField
            label="Heading (optional)"
            error={errors?.[index]?.heading?.message}
            {...register(`biography.${index}.heading`)}
          />
          <TextAreaField
            label="Text"
            rows={6}
            error={errors?.[index]?.body?.message}
            {...register(`biography.${index}.body`)}
          />
        </>
      )}
    />
  );
}

export function EducationSection() {
  const { control, register, formState } = useProfileForm();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'education' });
  const errors = formState.errors.education;

  return (
    <RepeatableList
      id="education"
      legend="Education"
      keys={fields.map((field) => field.id)}
      max={30}
      itemLabel={(index) => `Education ${String(index + 1)}`}
      addLabel="Add education"
      emptyMessage="No education entries yet."
      error={listError(errors)}
      onAdd={() => {
        append({ year: '', title: '', institution: '', location: '' });
      }}
      onRemove={remove}
      onMove={move}
      renderItem={(index) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label="Year"
            error={errors?.[index]?.year?.message}
            {...register(`education.${index}.year`)}
          />
          <FormField
            label="Qualification"
            error={errors?.[index]?.title?.message}
            {...register(`education.${index}.title`)}
          />
          <FormField
            label="Institution (optional)"
            error={errors?.[index]?.institution?.message}
            {...register(`education.${index}.institution`)}
          />
          <FormField
            label="Location (optional)"
            error={errors?.[index]?.location?.message}
            {...register(`education.${index}.location`)}
          />
        </div>
      )}
    />
  );
}

export function ExperienceSection() {
  const { control, register, formState } = useProfileForm();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'experience' });
  const errors = formState.errors.experience;

  return (
    <RepeatableList
      id="experience"
      legend="Experience"
      hint="On the About page, performance roles appear in the timeline and teaching roles under Teaching. “Other” entries are saved but not shown."
      keys={fields.map((field) => field.id)}
      max={50}
      itemLabel={(index) => `Experience ${String(index + 1)}`}
      addLabel="Add experience"
      emptyMessage="No experience entries yet."
      error={listError(errors)}
      onAdd={() => {
        append({
          period: '',
          role: '',
          organization: '',
          location: '',
          category: 'performance',
          highlights: [],
        });
      }}
      onRemove={remove}
      onMove={move}
      renderItem={(index) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Period"
              hint="For example “2019 – 2023” or “2021 – Present”."
              error={errors?.[index]?.period?.message}
              {...register(`experience.${index}.period`)}
            />
            <SelectField
              label="Category"
              error={errors?.[index]?.category?.message}
              {...register(`experience.${index}.category`)}
            >
              {EXPERIENCE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {EXPERIENCE_CATEGORY_LABELS[category]}
                </option>
              ))}
            </SelectField>
            <FormField
              label="Role"
              error={errors?.[index]?.role?.message}
              {...register(`experience.${index}.role`)}
            />
            <FormField
              label="Organisation"
              error={errors?.[index]?.organization?.message}
              {...register(`experience.${index}.organization`)}
            />
            <FormField
              label="Location (optional)"
              error={errors?.[index]?.location?.message}
              {...register(`experience.${index}.location`)}
            />
          </div>
          <Controller
            control={control}
            name={`experience.${index}.highlights`}
            render={({ field, fieldState }) => (
              <LinesField
                label="Highlights (optional)"
                hint="One per line, up to 10."
                rows={3}
                error={
                  fieldState.error?.message ??
                  errors?.[index]?.highlights?.find?.((item) => item?.message)?.message
                }
                {...field}
              />
            )}
          />
        </>
      )}
    />
  );
}

export function AchievementsSection() {
  const { control, register, formState } = useProfileForm();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'achievements' });
  const errors = formState.errors.achievements;

  return (
    <RepeatableList
      id="achievements"
      legend="Achievements"
      keys={fields.map((field) => field.id)}
      max={50}
      itemLabel={(index) => `Achievement ${String(index + 1)}`}
      addLabel="Add achievement"
      emptyMessage="No achievements yet."
      error={listError(errors)}
      onAdd={() => {
        append({ year: '', title: '', description: '' });
      }}
      onRemove={remove}
      onMove={move}
      renderItem={(index) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
            <FormField
              label="Year (optional)"
              error={errors?.[index]?.year?.message}
              {...register(`achievements.${index}.year`)}
            />
            <FormField
              label="Title"
              error={errors?.[index]?.title?.message}
              {...register(`achievements.${index}.title`)}
            />
          </div>
          <TextAreaField
            label="Description (optional)"
            rows={2}
            error={errors?.[index]?.description?.message}
            {...register(`achievements.${index}.description`)}
          />
        </>
      )}
    />
  );
}

export function AffiliationsSection() {
  const { control, register, formState } = useProfileForm();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'affiliations' });
  const errors = formState.errors.affiliations;

  return (
    <RepeatableList
      id="affiliations"
      legend="Affiliations"
      keys={fields.map((field) => field.id)}
      max={20}
      itemLabel={(index) => `Affiliation ${String(index + 1)}`}
      addLabel="Add affiliation"
      emptyMessage="No affiliations yet."
      error={listError(errors)}
      onAdd={() => {
        append({ name: '', since: '' });
      }}
      onRemove={remove}
      onMove={move}
      renderItem={(index) => (
        <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
          <FormField
            label="Name"
            error={errors?.[index]?.name?.message}
            {...register(`affiliations.${index}.name`)}
          />
          <FormField
            label="Since (optional)"
            error={errors?.[index]?.since?.message}
            {...register(`affiliations.${index}.since`)}
          />
        </div>
      )}
    />
  );
}

export function SocialsSection() {
  const { control, register, formState } = useProfileForm();
  const { fields, append, remove, move } = useFieldArray({ control, name: 'socials' });
  const errors = formState.errors.socials;

  return (
    <RepeatableList
      id="socials"
      legend="Social links"
      hint="Shown on the Contact page. Links must start with https://."
      keys={fields.map((field) => field.id)}
      max={10}
      itemLabel={(index) => `Link ${String(index + 1)}`}
      addLabel="Add link"
      emptyMessage="No social links yet."
      error={listError(errors)}
      onAdd={() => {
        append({ platform: 'youtube', url: '', label: '' });
      }}
      onRemove={remove}
      onMove={move}
      renderItem={(index) => (
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <SelectField
            label="Platform"
            error={errors?.[index]?.platform?.message}
            {...register(`socials.${index}.platform`)}
          >
            {SOCIAL_PLATFORMS.map((platform) => (
              <option key={platform} value={platform}>
                {SOCIAL_PLATFORM_LABELS[platform]}
              </option>
            ))}
          </SelectField>
          <FormField
            label="Address (URL)"
            type="url"
            inputMode="url"
            placeholder="https://"
            error={errors?.[index]?.url?.message}
            {...register(`socials.${index}.url`)}
          />
          <FormField
            label="Label (optional)"
            className="sm:col-span-2"
            error={errors?.[index]?.label?.message}
            {...register(`socials.${index}.label`)}
          />
        </div>
      )}
    />
  );
}
