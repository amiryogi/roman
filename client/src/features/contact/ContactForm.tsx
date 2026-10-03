import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm, useWatch, type Path } from 'react-hook-form';
import type { z } from 'zod';

import {
  BOOKING_EVENT_TYPES,
  INQUIRY_TYPES,
  inquiryCreateInputSchema,
  type InquiryCreateInput,
} from '@roman/shared';

import { ApiClientError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errors';
import { getInquiryFormToken, sendInquiry } from '@/lib/api/public';
import { applyFieldErrors } from '@/lib/forms';
import { BOOKING_EVENT_TYPE_LABELS, INQUIRY_TYPE_LABELS } from '@/lib/labels';

import { InputField, SelectField, TextareaField } from './ContactFields';

type InquiryParsed = z.output<typeof inquiryCreateInputSchema>;

const FIELDS: readonly Path<InquiryCreateInput>[] = [
  'name',
  'email',
  'phone',
  'inquiryType',
  'eventType',
  'preferredDate',
  'eventLocation',
  'message',
];

const SUMMARY_FIELDS = [
  'name',
  'email',
  'phone',
  'inquiryType',
  'eventType',
  'preferredDate',
  'eventLocation',
  'message',
] as const;

/** Labels for the error summary, in form order (plan §12.4). */
const FIELD_LABELS: Record<(typeof SUMMARY_FIELDS)[number], string> = {
  name: 'Your name',
  email: 'Email',
  phone: 'Phone',
  inquiryType: 'What is it about?',
  eventType: 'Type of event',
  preferredDate: 'Date',
  eventLocation: 'Location',
  message: 'Message',
};

const EMPTY: InquiryCreateInput = {
  name: '',
  email: '',
  phone: '',
  inquiryType: 'booking',
  preferredDate: '',
  eventLocation: '',
  message: '',
  website: '',
  formToken: '',
};

function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

/**
 * Contact and booking form (plan §6, §12.6). Validated with the same schema as the server.
 * Spam is kept out by a hidden "website" field, a short minimum fill time (a signed token from
 * the server) and a rate limit, so genuine visitors never see a puzzle.
 */
export function ContactForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const token = useQuery({
    queryKey: ['inquiry-form-token'],
    queryFn: getInquiryFormToken,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 0,
  });

  const {
    control,
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors, isSubmitting, submitCount },
  } = useForm<InquiryCreateInput, unknown, InquiryParsed>({
    resolver: zodResolver(inquiryCreateInputSchema),
    defaultValues: EMPTY,
  });
  const inquiryType = useWatch({ control, name: 'inquiryType' });

  useEffect(() => {
    if (token.data) setValue('formToken', token.data);
  }, [token.data, setValue]);

  const onSubmit = handleSubmit(
    async (values) => {
      setFormError(null);
      try {
        await sendInquiry(values);
        setSentTo(values.email);
        reset(EMPTY);
      } catch (error) {
        const tokenProblem =
          error instanceof ApiClientError &&
          error.details.some((detail) => detail.path === 'formToken');
        if (tokenProblem) {
          // The form was open too long or sent instantly: a fresh token lets them send again.
          void token.refetch();
          setFormError(getErrorMessage(error));
          return;
        }
        if (!applyFieldErrors(error, setError, FIELDS)) setFormError(getErrorMessage(error));
      }
    },
    // On invalid input, focus goes to the first invalid field (React Hook Form) and the summary
    // below is announced as an alert (plan §12.4).
  );

  if (sentTo) {
    return (
      <div role="status" className="rounded-sm border border-ink/15 bg-white p-8">
        <p className="font-display text-[2rem] leading-tight font-medium">Thank you</p>
        <p className="mt-3 leading-relaxed text-ink-muted">
          Your message has been sent. The reply will come to <strong>{sentTo}</strong>.
        </p>
        <button
          type="button"
          onClick={() => {
            setSentTo(null);
            void token.refetch();
          }}
          className="mt-6 inline-flex min-h-11 items-center text-sm font-medium tracking-[0.14em] text-varnish-deep uppercase underline underline-offset-[6px]"
        >
          Send another message
        </button>
      </div>
    );
  }

  const summary = SUMMARY_FIELDS.flatMap((field) => {
    const message = errors[field]?.message;
    return message ? [{ field, label: FIELD_LABELS[field], message }] : [];
  });

  return (
    <form
      noValidate
      aria-labelledby="contact-form-title"
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-5 rounded-sm border border-ink/15 bg-white/60 p-6 sm:p-8"
    >
      <h2 id="contact-form-title" className="font-display text-[2rem] leading-tight font-medium">
        Send an enquiry
      </h2>

      {submitCount > 0 && summary.length > 0 && (
        <div role="alert" className="rounded-sm border border-danger/40 bg-white p-4 text-sm">
          <p className="font-medium text-danger">Please check the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {summary.map((item) => (
              <li key={item.field}>
                <a href={`#contact-${item.field}`} className="underline underline-offset-2">
                  {item.label}: {item.message}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      {formError && (
        <p
          role="alert"
          className="rounded-sm border border-danger/40 bg-white p-4 text-sm text-danger"
        >
          {formError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          id="contact-name"
          label="Your name"
          required
          autoComplete="name"
          error={errors.name?.message}
          {...register('name')}
        />
        <InputField
          id="contact-email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
      </div>
      <InputField
        id="contact-phone"
        label="Phone"
        type="tel"
        autoComplete="tel"
        hint="Include the country code if you’re outside Nepal."
        error={errors.phone?.message}
        {...register('phone')}
      />

      <SelectField
        id="contact-inquiryType"
        label="What is it about?"
        required
        error={errors.inquiryType?.message}
        {...register('inquiryType')}
      >
        {INQUIRY_TYPES.map((type) => (
          <option key={type} value={type}>
            {INQUIRY_TYPE_LABELS[type]}
          </option>
        ))}
      </SelectField>

      {inquiryType === 'booking' && (
        <SelectField
          id="contact-eventType"
          label="Type of event"
          required
          error={errors.eventType?.message}
          {...register('eventType', {
            setValueAs: (value: unknown) => (value === '' ? undefined : value),
          })}
        >
          <option value="">Choose…</option>
          {BOOKING_EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {BOOKING_EVENT_TYPE_LABELS[type]}
            </option>
          ))}
        </SelectField>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          id="contact-preferredDate"
          label="Date"
          type="date"
          min={todayIso()}
          error={errors.preferredDate?.message}
          {...register('preferredDate')}
        />
        <InputField
          id="contact-eventLocation"
          label="Location"
          hint="City or venue."
          error={errors.eventLocation?.message}
          {...register('eventLocation')}
        />
      </div>

      <TextareaField
        id="contact-message"
        label="Message"
        required
        rows={6}
        hint="The occasion, the music you have in mind, and anything else that helps."
        error={errors.message?.message}
        {...register('message')}
      />

      {/* Honeypot: invisible to people and skipped by keyboard and screen readers; bots fill it. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="contact-website">Website</label>
        <input id="contact-website" tabIndex={-1} autoComplete="off" {...register('website')} />
      </div>

      {token.isError ? (
        <p role="alert" className="text-sm text-danger">
          The form couldn’t be prepared. {getErrorMessage(token.error)}{' '}
          <button type="button" onClick={() => void token.refetch()} className="underline">
            Try again
          </button>
        </p>
      ) : null}

      <div>
        <button
          type="submit"
          disabled={isSubmitting || !token.data}
          className="inline-flex min-h-11 items-center rounded-sm bg-varnish-deep px-6 text-sm font-medium tracking-[0.14em] text-ivory uppercase hover:brightness-110 disabled:opacity-60"
        >
          {isSubmitting ? 'Sending…' : 'Send enquiry'}
        </button>
      </div>
    </form>
  );
}
