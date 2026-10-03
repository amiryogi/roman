import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import type { z } from 'zod';

import {
  INQUIRY_STATUSES,
  inquiryUpdateInputSchema,
  type InquiryDto,
  type InquiryStatus,
  type InquiryUpdateInput,
} from '@roman/shared';

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import {
  adminDangerSmallButton,
  adminPrimaryButton,
  adminSecondaryButton,
} from '@/features/admin/components/adminStyles';
import { ConfirmDialog } from '@/features/admin/components/ConfirmDialog';
import { TextAreaField } from '@/features/admin/components/Fields';
import { FormAlert } from '@/features/admin/components/FormAlert';
import { PageSpinner } from '@/features/admin/components/PageSpinner';
import { useInvalidate } from '@/features/admin/components/useAdminList';
import { SAVED_STATE, useUnsavedChanges } from '@/features/admin/components/useUnsavedChanges';
import { adminKeys, deleteInquiry, getInquiry, updateInquiry } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { formatDateTime } from '@/lib/format';
import {
  BOOKING_EVENT_TYPE_LABELS,
  INQUIRY_STATUS_LABELS,
  INQUIRY_TYPE_LABELS,
} from '@/lib/labels';

import { InquiryStatusBadge } from './InquiryStatusBadge';

const notesSchema = inquiryUpdateInputSchema.pick({ adminNotes: true });
type NotesInput = z.input<typeof notesSchema>;
type NotesParsed = z.output<typeof notesSchema>;

/** "Re: Booking a performance (12 March 2027)": a reply subject Roman can send as is. */
function replySubject(inquiry: InquiryDto): string {
  const date = inquiry.preferredDate
    ? ` (${new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(inquiry.preferredDate))})`
    : '';
  return `Re: ${INQUIRY_TYPE_LABELS[inquiry.inquiryType]}${date}`;
}

export function InquiryDetailPage() {
  const { id = '' } = useParams();
  const inquiry = useQuery({ queryKey: adminKeys.inquiry(id), queryFn: () => getInquiry(id) });

  if (inquiry.isPending) return <PageSpinner label="Loading inquiry…" />;
  if (inquiry.isError) {
    return (
      <section className="flex max-w-3xl flex-col gap-4">
        <FormAlert tone="error">{getErrorMessage(inquiry.error)}</FormAlert>
        <Link to="/admin/inquiries" className="underline underline-offset-4">
          Back to inquiries
        </Link>
      </section>
    );
  }
  return <InquiryView key={inquiry.data.id} inquiry={inquiry.data} />;
}

function InquiryView({ inquiry }: { inquiry: InquiryDto }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const invalidateLists = useInvalidate(adminKeys.inquiries, adminKeys.stats);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notesError, setNotesError] = useState<string | null>(null);

  function storeSaved(saved: InquiryDto) {
    queryClient.setQueryData(adminKeys.inquiry(saved.id), saved);
    return invalidateLists();
  }

  const { mutate: markRead } = useMutation({
    mutationFn: () => updateInquiry(inquiry.id, { status: 'read' }),
    onSuccess: storeSaved,
  });

  // Opening a new message marks it as read, which also clears it from the sidebar badge.
  const isNew = inquiry.status === 'new';
  useEffect(() => {
    if (isNew) markRead();
  }, [isNew, markRead]);

  const setStatus = useMutation({
    mutationFn: (status: InquiryStatus) => updateInquiry(inquiry.id, { status }),
    onSuccess: async (saved) => {
      toast.success(`Marked as ${INQUIRY_STATUS_LABELS[saved.status].toLowerCase()}`);
      await storeSaved(saved);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteInquiry(inquiry.id),
    onSuccess: async () => {
      toast.success('Inquiry deleted');
      queryClient.removeQueries({ queryKey: adminKeys.inquiry(inquiry.id) });
      await navigate('/admin/inquiries', { state: SAVED_STATE });
      await invalidateLists();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<NotesInput, unknown, NotesParsed>({
    resolver: zodResolver(notesSchema),
    defaultValues: { adminNotes: inquiry.adminNotes ?? '' },
  });
  const unsavedPrompt = useUnsavedChanges(isDirty && !remove.isSuccess);

  const saveNotes = handleSubmit(async (values) => {
    setNotesError(null);
    try {
      const input: InquiryUpdateInput = { adminNotes: values.adminNotes };
      const saved = await updateInquiry(inquiry.id, input);
      reset({ adminNotes: saved.adminNotes ?? '' });
      toast.success('Notes saved');
      await storeSaved(saved);
    } catch (error) {
      setNotesError(getErrorMessage(error));
    }
  });

  const mailto = `mailto:${inquiry.email}?subject=${encodeURIComponent(replySubject(inquiry))}`;

  return (
    <section className="flex max-w-3xl flex-col gap-8">
      <AdminPageHeader
        title={`Message from ${inquiry.name}`}
        action={
          <Link to="/admin/inquiries" className={adminSecondaryButton}>
            Back to inquiries
          </Link>
        }
      />

      <div className="rounded-sm border border-stone-200 bg-white p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-stone-600">
          <InquiryStatusBadge status={inquiry.status} />
          <span>Received {formatDateTime(inquiry.createdAt)}</span>
        </div>
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[10rem_1fr]">
          <dt className="font-medium text-stone-600">Email</dt>
          <dd className="break-all">
            <a href={`mailto:${inquiry.email}`} className="underline underline-offset-4">
              {inquiry.email}
            </a>
          </dd>
          {inquiry.phone && (
            <>
              <dt className="font-medium text-stone-600">Phone</dt>
              <dd>
                <a
                  href={`tel:${inquiry.phone.replace(/[^+\d]/g, '')}`}
                  className="underline underline-offset-4"
                >
                  {inquiry.phone}
                </a>
              </dd>
            </>
          )}
          <dt className="font-medium text-stone-600">About</dt>
          <dd>{INQUIRY_TYPE_LABELS[inquiry.inquiryType]}</dd>
          {inquiry.eventType && (
            <>
              <dt className="font-medium text-stone-600">Type of event</dt>
              <dd>{BOOKING_EVENT_TYPE_LABELS[inquiry.eventType]}</dd>
            </>
          )}
          {inquiry.preferredDate && (
            <>
              <dt className="font-medium text-stone-600">Preferred date</dt>
              <dd>
                <time dateTime={inquiry.preferredDate}>
                  {new Intl.DateTimeFormat('en-GB', {
                    dateStyle: 'full',
                    timeZone: 'UTC',
                  }).format(new Date(inquiry.preferredDate))}
                </time>
              </dd>
            </>
          )}
          {inquiry.eventLocation && (
            <>
              <dt className="font-medium text-stone-600">Location</dt>
              <dd>{inquiry.eventLocation}</dd>
            </>
          )}
        </dl>
        <h2 className="mt-6 mb-2 font-semibold">Message</h2>
        <p className="whitespace-pre-wrap">{inquiry.message}</p>
        <div className="mt-6">
          <a href={mailto} className={adminPrimaryButton}>
            Reply by email
          </a>
        </div>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-lg font-semibold">Status</legend>
        <div className="flex flex-wrap gap-2">
          {INQUIRY_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              aria-pressed={inquiry.status === status}
              disabled={setStatus.isPending || inquiry.status === status}
              onClick={() => {
                setStatus.mutate(status);
              }}
              className={
                inquiry.status === status
                  ? `${adminSecondaryButton} border-stone-900 bg-stone-900 text-white hover:bg-stone-900 disabled:opacity-100`
                  : adminSecondaryButton
              }
            >
              {INQUIRY_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <p className="text-sm text-stone-600">
          Replying opens your email app; mark the inquiry as replied once the email is sent.
        </p>
      </fieldset>

      <form noValidate className="flex flex-col gap-3" onSubmit={(event) => void saveNotes(event)}>
        <h2 className="text-lg font-semibold">Private notes</h2>
        {notesError && <FormAlert tone="error">{notesError}</FormAlert>}
        <TextAreaField
          label="Notes (only visible here)"
          rows={5}
          error={errors.adminNotes?.message}
          {...register('adminNotes')}
        />
        <div>
          <button type="submit" disabled={isSubmitting || !isDirty} className={adminPrimaryButton}>
            {isSubmitting ? 'Saving…' : 'Save notes'}
          </button>
        </div>
      </form>

      <div className="border-t border-stone-200 pt-6">
        <button
          type="button"
          onClick={() => {
            setConfirmDelete(true);
          }}
          className={adminDangerSmallButton}
        >
          Delete inquiry
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this inquiry?"
        message={`The message from ${inquiry.name} and your notes will be deleted permanently.`}
        confirmLabel="Delete inquiry"
        busy={remove.isPending}
        onConfirm={() => {
          remove.mutate();
        }}
        onCancel={() => {
          setConfirmDelete(false);
        }}
      />
      {unsavedPrompt}
    </section>
  );
}
