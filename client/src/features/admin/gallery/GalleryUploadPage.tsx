import { useId, useReducer, useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';

import {
  GALLERY_CATEGORIES,
  galleryImageCreateInputSchema,
  type GalleryCategory,
  type GalleryImageCreateInput,
  type MediaAssetDto,
} from '@roman/shared';

import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import {
  adminPrimaryButton,
  adminSecondaryButton,
  adminSmallButton,
} from '@/features/admin/components/adminStyles';
import { useInvalidate } from '@/features/admin/components/useAdminList';
import { adminKeys, createGalleryImage } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { queryKeys } from '@/lib/api/public';
import { getUploadSignature, verifyUpload } from '@/lib/api/uploads';
import { getMediaUrls } from '@/lib/cloudinary';
import {
  acceptFor,
  checkFileSize,
  checkFileType,
  uploadToCloudinary,
  UploadError,
} from '@/lib/cloudinaryUpload';
import { GALLERY_CATEGORY_LABELS } from '@/lib/labels';

/** Parallel uploads (plan §13). */
const CONCURRENCY = 3;

interface Row {
  key: string;
  name: string;
  state: 'queued' | 'uploading' | 'ready' | 'saving' | 'saved' | 'failed';
  progress: number;
  asset?: MediaAssetDto;
  error?: string;
  alt: string;
  category: GalleryCategory;
  caption: string;
  photographerCredit: string;
  /** Field problems from the shared schema, by field name. */
  issues: Partial<Record<'alt' | 'category' | 'caption' | 'photographerCredit', string>>;
  savedAs?: 'draft' | 'published';
}

type Action =
  | { type: 'add'; rows: Row[] }
  | { type: 'patch'; key: string; changes: Partial<Row> }
  | { type: 'remove'; key: string };

function rowsReducer(rows: Row[], action: Action): Row[] {
  switch (action.type) {
    case 'add':
      return [...rows, ...action.rows];
    case 'patch':
      return rows.map((row) => (row.key === action.key ? { ...row, ...action.changes } : row));
    case 'remove':
      return rows.filter((row) => row.key !== action.key);
  }
}

let nextKey = 0;

/**
 * Bulk photo upload (plan §13). Files go straight to Cloudinary, three at a time. Each photo is
 * saved only once it has alt text and a category, as a draft unless "Publish" is chosen.
 */
export function GalleryUploadPage() {
  const inputId = useId();
  const [rows, dispatch] = useReducer(rowsReducer, []);
  const [category, setCategory] = useState<GalleryCategory>('performance');
  const [credit, setCredit] = useState('');
  const [publish, setPublish] = useState(false);
  const [dragging, setDragging] = useState(false);
  const queue = useRef<{ key: string; file: File }[]>([]);
  const active = useRef(0);
  const invalidate = useInvalidate(adminKeys.gallery, ['gallery'], queryKeys.home);

  const patch = (key: string, changes: Partial<Row>) => {
    dispatch({ type: 'patch', key, changes });
  };

  async function upload(key: string, file: File) {
    const typeProblem = checkFileType(file, 'gallery');
    if (typeProblem) {
      patch(key, { state: 'failed', error: typeProblem });
      return;
    }
    try {
      patch(key, { state: 'uploading' });
      const signature = await getUploadSignature('gallery');
      const sizeProblem = checkFileSize(file, signature.constraints.maxBytes);
      if (sizeProblem) {
        patch(key, { state: 'failed', error: sizeProblem });
        return;
      }
      const ref = await uploadToCloudinary(file, signature, {
        onProgress: (fraction) => {
          patch(key, { progress: fraction });
        },
      });
      patch(key, { state: 'ready', asset: await verifyUpload('gallery', ref), progress: 1 });
    } catch (error) {
      patch(key, {
        state: 'failed',
        error: error instanceof UploadError ? error.message : getErrorMessage(error),
      });
    }
  }

  function pump() {
    while (active.current < CONCURRENCY) {
      const next = queue.current.shift();
      if (!next) return;
      active.current += 1;
      void upload(next.key, next.file).finally(() => {
        active.current -= 1;
        pump();
      });
    }
  }

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added = [...files].map((file) => {
      nextKey += 1;
      return { key: `photo-${String(nextKey)}`, file };
    });
    dispatch({
      type: 'add',
      rows: added.map(({ key, file }) => ({
        key,
        name: file.name,
        state: 'queued',
        progress: 0,
        alt: '',
        category,
        caption: '',
        photographerCredit: credit,
        issues: {},
      })),
    });
    queue.current.push(...added);
    pump();
  }

  async function save(row: Row): Promise<boolean> {
    if (!row.asset || row.state !== 'ready') return false;
    const input: GalleryImageCreateInput = {
      image: { publicId: row.asset.publicId, resourceType: row.asset.resourceType },
      alt: row.alt,
      category: row.category,
      caption: row.caption,
      photographerCredit: row.photographerCredit,
      status: publish ? 'published' : 'draft',
    };
    // The same rules the server applies (shared schema): alt text 5–250 characters, etc.
    const parsed = galleryImageCreateInputSchema.safeParse(input);
    if (!parsed.success) {
      const issues: Row['issues'] = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (
          field === 'alt' ||
          field === 'category' ||
          field === 'caption' ||
          field === 'photographerCredit'
        ) {
          issues[field] = issue.message;
        }
      }
      patch(row.key, { issues });
      return false;
    }
    patch(row.key, { state: 'saving', issues: {} });
    try {
      await createGalleryImage(input);
      patch(row.key, { state: 'saved', savedAs: publish ? 'published' : 'draft' });
      return true;
    } catch (error) {
      patch(row.key, { state: 'ready', error: getErrorMessage(error) });
      return false;
    }
  }

  async function saveAll() {
    let saved = 0;
    for (const row of rows) {
      if (await save(row)) saved += 1;
    }
    if (saved > 0) {
      toast.success(`${String(saved)} photo${saved === 1 ? '' : 's'} saved`);
      await invalidate();
    }
  }

  const ready = rows.filter((row) => row.state === 'ready').length;
  const busy = rows.some((row) => row.state === 'queued' || row.state === 'uploading');

  return (
    <section className="max-w-5xl">
      <AdminPageHeader
        title="Upload photos"
        action={
          <Link to="/admin/gallery" className={adminSecondaryButton}>
            Back to the gallery
          </Link>
        }
      />

      <div className="grid gap-4 rounded-sm border border-stone-200 bg-white p-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-800">
          Category for new photos
          <select
            value={category}
            onChange={(event) => {
              const value = GALLERY_CATEGORIES.find((c) => c === event.currentTarget.value);
              if (value) setCategory(value);
            }}
            className="min-h-10 rounded-sm border border-stone-300 bg-white px-3 font-normal"
          >
            {GALLERY_CATEGORIES.map((option) => (
              <option key={option} value={option}>
                {GALLERY_CATEGORY_LABELS[option]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-stone-800">
          Photographer for new photos
          <input
            name="defaultCredit"
            value={credit}
            onChange={(event) => {
              setCredit(event.currentTarget.value);
            }}
            className="min-h-10 rounded-sm border border-stone-300 px-3 font-normal"
          />
        </label>
        <label className="flex items-center gap-3 self-end text-sm font-medium text-stone-800">
          <input
            type="checkbox"
            name="publishOnSave"
            checked={publish}
            onChange={(event) => {
              setPublish(event.currentTarget.checked);
            }}
            className="size-5 accent-amber-700"
          />
          Publish when saved (otherwise drafts)
        </label>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={(event: DragEvent<HTMLDivElement>) => {
          event.preventDefault();
          setDragging(false);
          addFiles(event.dataTransfer.files);
        }}
        className={[
          'mt-4 flex flex-col items-start gap-3 rounded-sm border border-dashed p-6',
          dragging ? 'border-amber-700 bg-amber-50' : 'border-stone-300 bg-white',
        ].join(' ')}
      >
        <label htmlFor={inputId} className="text-sm font-medium text-stone-800">
          Choose photos, or drag them here (JPG, PNG, WebP or HEIC)
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          accept={acceptFor('gallery')}
          onChange={(event) => {
            addFiles(event.currentTarget.files);
            event.currentTarget.value = '';
          }}
          className="text-sm file:mr-3 file:rounded-sm file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5"
        />
      </div>

      {rows.length > 0 && (
        <>
          <ul className="mt-6 flex flex-col gap-4">
            {rows.map((row) => (
              <PhotoRow
                key={row.key}
                row={row}
                onChange={(changes) => {
                  patch(row.key, changes);
                }}
                onSave={() => {
                  void save(row).then(async (ok) => {
                    if (ok) {
                      toast.success('Photo saved');
                      await invalidate();
                    }
                  });
                }}
                onRemove={() => {
                  dispatch({ type: 'remove', key: row.key });
                }}
              />
            ))}
          </ul>
          <div className="mt-6 flex items-center gap-4">
            <button
              type="button"
              disabled={ready === 0}
              onClick={() => void saveAll()}
              className={adminPrimaryButton}
            >
              Save all ready photos ({ready})
            </button>
            {busy && (
              <p role="status" className="text-sm text-stone-600">
                Uploading…
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}

interface PhotoRowProps {
  row: Row;
  onChange: (changes: Partial<Row>) => void;
  onSave: () => void;
  onRemove: () => void;
}

function PhotoRow({ row, onChange, onSave, onRemove }: PhotoRowProps) {
  const id = useId();
  const editable = row.state === 'ready';
  const field = 'rounded-sm border px-3 py-2 text-sm';

  return (
    <li className="grid gap-4 rounded-sm border border-stone-200 bg-white p-4 md:grid-cols-[8rem_1fr]">
      <div className="flex flex-col gap-2">
        {row.asset ? (
          <img
            src={getMediaUrls().imageUrl(row.asset, { crop: 'fill', width: 256, height: 256 })}
            alt=""
            width={128}
            height={128}
            className="size-32 rounded-sm object-cover"
          />
        ) : (
          <span aria-hidden="true" className="size-32 rounded-sm bg-stone-100" />
        )}
        <p className="truncate text-xs text-stone-600" title={row.name}>
          {row.name}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {(row.state === 'queued' || row.state === 'uploading') && (
          <progress
            max={1}
            value={row.progress}
            aria-label={`Uploading ${row.name}`}
            className="h-2 w-full"
          />
        )}
        {row.error && (
          <p role="alert" className="text-sm text-red-800">
            {row.error}
          </p>
        )}
        {row.state === 'saved' ? (
          <p role="status" className="text-sm text-emerald-900">
            Saved{row.savedAs === 'draft' ? ' as a draft' : ' and published'}.
          </p>
        ) : (
          row.state !== 'failed' && (
            <>
              <div className="flex flex-col gap-1">
                <label htmlFor={`${id}-alt`} className="text-sm font-medium text-stone-800">
                  Description (alt text, required)
                </label>
                <textarea
                  id={`${id}-alt`}
                  rows={2}
                  value={row.alt}
                  disabled={!editable}
                  aria-invalid={row.issues.alt ? true : undefined}
                  aria-describedby={row.issues.alt ? `${id}-alt-error` : `${id}-alt-hint`}
                  onChange={(event) => {
                    onChange({ alt: event.currentTarget.value });
                  }}
                  className={`${field} ${row.issues.alt ? 'border-red-700' : 'border-stone-300'}`}
                />
                {row.issues.alt ? (
                  <p id={`${id}-alt-error`} className="text-sm text-red-800">
                    {row.issues.alt}
                  </p>
                ) : (
                  <p id={`${id}-alt-hint`} className="text-sm text-stone-600">
                    What the photo shows, for people who can’t see it. 5–250 characters.
                  </p>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1 text-sm font-medium text-stone-800">
                  Category
                  <select
                    value={row.category}
                    disabled={!editable}
                    onChange={(event) => {
                      const value = GALLERY_CATEGORIES.find((c) => c === event.currentTarget.value);
                      if (value) onChange({ category: value });
                    }}
                    className={`${field} border-stone-300 bg-white font-normal`}
                  >
                    {GALLERY_CATEGORIES.map((option) => (
                      <option key={option} value={option}>
                        {GALLERY_CATEGORY_LABELS[option]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-stone-800">
                  Caption (optional)
                  <input
                    value={row.caption}
                    disabled={!editable}
                    onChange={(event) => {
                      onChange({ caption: event.currentTarget.value });
                    }}
                    className={`${field} border-stone-300 font-normal`}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium text-stone-800">
                  Photographer (optional)
                  <input
                    value={row.photographerCredit}
                    disabled={!editable}
                    onChange={(event) => {
                      onChange({ photographerCredit: event.currentTarget.value });
                    }}
                    className={`${field} border-stone-300 font-normal`}
                  />
                </label>
              </div>
            </>
          )
        )}
        <div className="flex gap-2">
          {editable && (
            <button type="button" onClick={onSave} className={adminSmallButton}>
              Save<span className="sr-only"> {row.name}</span>
            </button>
          )}
          {row.state !== 'saving' && row.state !== 'uploading' && (
            <button type="button" onClick={onRemove} className={adminSmallButton}>
              {row.state === 'saved' ? 'Hide' : 'Remove'}
              <span className="sr-only"> {row.name}</span>
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
