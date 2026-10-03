import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useId, useState } from 'react';
import { useForm, type DefaultValues, type Path } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { z } from 'zod';

import {
  DEFAULT_TIME_ZONE,
  eventCreateInputSchema,
  isoToZonedLocal,
  zonedLocalToIso,
  type EventCreateInput,
  type EventDto,
  type MediaAssetDto,
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
import { adminKeys, createEvent, getEvent, updateEvent } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';
import { applyFieldErrors } from '@/lib/forms';

type EventCreateParsed = z.output<typeof eventCreateInputSchema>;

const FIELDS: readonly Path<EventCreateInput>[] = [
  'title',
  'slug',
  'description',
  'startsAt',
  'endsAt',
  'timezone',
  'venue',
  'eventStatus',
  'ticketUrl',
  'infoUrl',
  'image',
  'status',
  'featured',
];

const SUGGESTED_ZONES = [
  'Asia/Kathmandu',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Europe/London',
  'America/New_York',
  'Australia/Sydney',
  'UTC',
];

const emptyToUndefined = (value: unknown) => (value === '' ? undefined : value);

/**
 * The form shows times as local wall time in the event's own zone (`datetime-local`); they are
 * converted to UTC instants before the shared schema validates them.
 */
const baseResolver = zodResolver(eventCreateInputSchema);
const resolver: typeof baseResolver = (values, context, options) => {
  const zone = values.timezone ?? DEFAULT_TIME_ZONE;
  const toUtc = (local: string) => zonedLocalToIso(local, zone) ?? local;
  return baseResolver(
    {
      ...values,
      startsAt: toUtc(values.startsAt),
      endsAt: values.endsAt ? toUtc(values.endsAt) : values.endsAt,
    },
    context,
    options,
  );
};

function toFormValues(event: EventDto): EventCreateInput {
  return {
    title: event.title,
    slug: event.slug,
    description: event.description ?? '',
    startsAt: isoToZonedLocal(event.startsAt, event.timezone),
    endsAt: event.endsAt ? isoToZonedLocal(event.endsAt, event.timezone) : '',
    timezone: event.timezone,
    venue: {
      name: event.venue.name,
      address: event.venue.address ?? '',
      city: event.venue.city,
      country: event.venue.country,
    },
    eventStatus: event.eventStatus,
    ticketUrl: event.ticketUrl ?? '',
    infoUrl: event.infoUrl ?? '',
    image: event.image ? { alt: event.image.alt } : null,
    status: event.status,
    featured: event.featured,
  };
}

const NEW_EVENT: DefaultValues<EventCreateInput> = {
  title: '',
  description: '',
  startsAt: '',
  endsAt: '',
  timezone: DEFAULT_TIME_ZONE,
  venue: { name: '', address: '', city: 'Kathmandu', country: 'Nepal' },
  eventStatus: 'scheduled',
  ticketUrl: '',
  infoUrl: '',
  image: null,
  status: 'draft',
  featured: false,
};

export function EventEditPage() {
  const { id } = useParams();
  const editing = id !== undefined && id !== 'new';
  const event = useQuery({
    queryKey: adminKeys.event(id ?? 'new'),
    queryFn: () => getEvent(id ?? ''),
    enabled: editing,
  });

  if (editing && event.isPending) return <PageSpinner label="Loading event…" />;
  if (editing && event.isError) {
    return <FormAlert tone="error">{getErrorMessage(event.error)}</FormAlert>;
  }
  return <EventForm key={event.data?.id ?? 'new'} event={event.data} />;
}

function EventForm({ event }: { event: EventDto | undefined }) {
  const navigate = useNavigate();
  const zoneListId = useId();
  const invalidate = useInvalidate(adminKeys.events, ['events'], queryKeys.home);
  const [imageAsset, setImageAsset] = useState<MediaAssetDto | null>(event?.image?.asset ?? null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<EventCreateInput, unknown, EventCreateParsed>({
    resolver,
    defaultValues: event ? toFormValues(event) : NEW_EVENT,
  });

  const save = useMutation({
    mutationFn: (values: EventCreateInput) =>
      event ? updateEvent(event.id, values) : createEvent(values),
  });

  const unsavedPrompt = useUnsavedChanges(isDirty);

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const saved = await save.mutateAsync(values);
      toast.success(`“${saved.title}” saved`);
      await invalidate();
      await navigate('/admin/events', { state: SAVED_STATE });
    } catch (error) {
      if (!applyFieldErrors(error, setError, FIELDS)) setFormError(getErrorMessage(error));
    }
  });

  return (
    <section className="max-w-3xl">
      <AdminPageHeader title={event ? `Edit “${event.title}”` : 'Add an event'} />
      <form noValidate className="flex flex-col gap-6" onSubmit={(e) => void onSubmit(e)}>
        {formError && <FormAlert tone="error">{formError}</FormAlert>}

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Event</legend>
          <FormField label="Title" error={errors.title?.message} {...register('title')} />
          <FormField
            label="Address name (slug)"
            hint={
              event
                ? 'Used in links such as /events#slug.'
                : 'Optional. Leave empty to create it from the title.'
            }
            error={errors.slug?.message}
            {...register('slug', { setValueAs: emptyToUndefined })}
          />
          <SelectField
            label="Status of the event"
            error={errors.eventStatus?.message}
            {...register('eventStatus')}
          >
            <option value="scheduled">Scheduled</option>
            <option value="postponed">Postponed</option>
            <option value="cancelled">Cancelled</option>
          </SelectField>
          <TextAreaField
            label="Description"
            error={errors.description?.message}
            {...register('description')}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Date and time</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="Starts"
              type="datetime-local"
              error={errors.startsAt?.message}
              {...register('startsAt')}
            />
            <FormField
              label="Ends"
              type="datetime-local"
              hint="Optional."
              error={errors.endsAt?.message}
              {...register('endsAt')}
            />
          </div>
          <FormField
            label="Time zone"
            list={zoneListId}
            hint="Times above are in this zone. Visitors see them with the zone’s name."
            error={errors.timezone?.message}
            {...register('timezone')}
          />
          <datalist id={zoneListId}>
            {SUGGESTED_ZONES.map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Venue</legend>
          <FormField
            label="Venue name"
            error={errors.venue?.name?.message}
            {...register('venue.name')}
          />
          <FormField
            label="Address"
            hint="Optional."
            error={errors.venue?.address?.message}
            {...register('venue.address')}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              label="City"
              error={errors.venue?.city?.message}
              {...register('venue.city')}
            />
            <FormField
              label="Country"
              error={errors.venue?.country?.message}
              {...register('venue.country')}
            />
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Links</legend>
          <FormField
            label="Tickets link"
            type="url"
            hint="Optional. Must start with https://"
            error={errors.ticketUrl?.message}
            {...register('ticketUrl')}
          />
          <FormField
            label="More information link"
            type="url"
            hint="Optional. Must start with https://"
            error={errors.infoUrl?.message}
            {...register('infoUrl')}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-lg font-semibold">Image</legend>
          <MediaUploader
            kind="event"
            label="Image (optional)"
            value={imageAsset}
            removable
            onChange={(asset) => {
              setImageAsset(asset);
              setValue(
                'image',
                asset
                  ? {
                      mediaRef: { publicId: asset.publicId, resourceType: asset.resourceType },
                      alt: getValues('image.alt') ?? '',
                    }
                  : null,
                { shouldDirty: true },
              );
            }}
          />
          {imageAsset && (
            <FormField
              label="Image description (alt text)"
              error={errors.image?.alt?.message ?? errors.image?.message}
              {...register('image.alt')}
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
            {isSubmitting ? 'Saving…' : 'Save event'}
          </button>
          <Link to="/admin/events" className={adminSecondaryButton}>
            Cancel
          </Link>
        </div>
      </form>
      {unsavedPrompt}
    </section>
  );
}
