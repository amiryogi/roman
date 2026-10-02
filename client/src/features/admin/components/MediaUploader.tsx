import { useEffect, useId, useRef, useState, type DragEvent } from 'react';

import { UPLOAD_KIND_RULES, type MediaAssetDto, type UploadKind } from '@roman/shared';

import { getErrorMessage } from '@/lib/api/errors';
import { getUploadSignature, verifyUpload } from '@/lib/api/uploads';
import { createMediaUrls } from '@/lib/cloudinary';
import {
  acceptFor,
  checkFileSize,
  checkFileType,
  uploadToCloudinary,
  UploadError,
} from '@/lib/cloudinaryUpload';
import { env } from '@/lib/env';

import { FormAlert } from './FormAlert';

export interface MediaUploaderProps {
  kind: UploadKind;
  label: string;
  hint?: string;
  /** The current media, e.g. when editing. Verified by the server, so safe to save. */
  value: MediaAssetDto | null;
  onChange: (asset: MediaAssetDto | null) => void;
  /** Show a Remove button (for optional media). */
  removable?: boolean;
}

type Status =
  | { step: 'idle' }
  | { step: 'uploading'; fileName: string; progress: number }
  | { step: 'verifying'; fileName: string }
  | { step: 'error'; message: string };

const button =
  'rounded-sm border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700 disabled:opacity-60';

function formatBytes(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${String(Math.round(bytes / 1024))} KB`;
}

function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  return `${String(Math.floor(whole / 60))}:${String(whole % 60).padStart(2, '0')}`;
}

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/**
 * Uploads one file straight to Cloudinary with progress (plan §9.2, §13): checks the file,
 * gets a signature for the kind, uploads, then has the server verify the result.
 */
export function MediaUploader({
  kind,
  label,
  hint,
  value,
  onChange,
  removable = false,
}: MediaUploaderProps) {
  const inputId = useId();
  const hintId = `${inputId}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<Status>({ step: 'idle' });
  const [cloudName, setCloudName] = useState(env.cloudinaryCloudName);
  const [dragging, setDragging] = useState(false);
  const busy = status.step === 'uploading' || status.step === 'verifying';
  const mediaKind = UPLOAD_KIND_RULES[kind].mediaKind;

  // Cancel an upload in progress when the form goes away.
  useEffect(() => () => abortRef.current?.abort(), []);

  async function upload(file: File) {
    const typeProblem = checkFileType(file, kind);
    if (typeProblem) {
      setStatus({ step: 'error', message: typeProblem });
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus({ step: 'uploading', fileName: file.name, progress: 0 });
    try {
      const signature = await getUploadSignature(kind);
      const sizeProblem = checkFileSize(file, signature.constraints.maxBytes);
      if (sizeProblem) {
        setStatus({ step: 'error', message: sizeProblem });
        return;
      }
      setCloudName(signature.cloudName);
      const ref = await uploadToCloudinary(file, signature, {
        signal: controller.signal,
        onProgress: (fraction) => {
          setStatus({ step: 'uploading', fileName: file.name, progress: fraction });
        },
      });
      setStatus({ step: 'verifying', fileName: file.name });
      onChange(await verifyUpload(kind, ref));
      setStatus({ step: 'idle' });
    } catch (error) {
      if (isAbort(error)) {
        setStatus({ step: 'idle' });
        return;
      }
      setStatus({
        step: 'error',
        message: error instanceof UploadError ? error.message : getErrorMessage(error),
      });
    } finally {
      abortRef.current = null;
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files[0];
    if (file && !busy) void upload(file);
  }

  const urls = cloudName ? createMediaUrls(cloudName) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-stone-800">
        {label}
      </label>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => {
          setDragging(false);
        }}
        onDrop={handleDrop}
        className={[
          'flex flex-col gap-3 rounded-sm border border-dashed p-4',
          dragging ? 'border-amber-700 bg-amber-50' : 'border-stone-300 bg-white',
        ].join(' ')}
      >
        {value && (
          <div className="flex flex-wrap items-start gap-4">
            {urls && mediaKind === 'image' && (
              <img
                src={urls.imageUrl(value, { crop: 'fill', width: 160, height: 160 })}
                alt=""
                width={80}
                height={80}
                className="size-20 rounded-sm object-cover"
                style={value.dominantColor ? { backgroundColor: value.dominantColor } : undefined}
              />
            )}
            {urls && mediaKind === 'audio' && (
              // Admin previews use the plain native player (plan §23).
              <audio controls preload="none" src={urls.audioUrl(value)} className="max-w-full">
                <track kind="captions" />
              </audio>
            )}
            {urls && mediaKind === 'video' && (
              <video
                controls
                preload="none"
                src={urls.videoUrl(value, { width: 720 })}
                poster={urls.videoPosterUrl(value, { width: 480 })}
                className="w-60 rounded-sm"
              >
                <track kind="captions" />
              </video>
            )}
            <dl className="text-sm text-stone-600">
              <div>
                <dt className="sr-only">File</dt>
                <dd className="font-medium text-stone-800">
                  {value.originalFilename ?? value.publicId.split('/').at(-1)}
                </dd>
              </div>
              <div>
                <dt className="sr-only">Details</dt>
                <dd>
                  {[
                    value.format.toUpperCase(),
                    formatBytes(value.bytes),
                    value.width && value.height
                      ? `${String(value.width)}×${String(value.height)}`
                      : undefined,
                    value.duration === undefined ? undefined : formatDuration(value.duration),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </dd>
              </div>
            </dl>
          </div>
        )}

        {!value && status.step === 'idle' && (
          <p className="text-sm text-stone-600">Drag a file here, or choose one below.</p>
        )}

        {status.step === 'uploading' && (
          <div className="flex items-center gap-3 text-sm">
            <progress
              max={1}
              value={status.progress}
              aria-label={`Uploading ${status.fileName}`}
              className="h-2 flex-1"
            />
            <span aria-hidden="true" className="w-10 text-right tabular-nums">
              {Math.round(status.progress * 100)}%
            </span>
            <button type="button" className={button} onClick={() => abortRef.current?.abort()}>
              Cancel
            </button>
          </div>
        )}
        {status.step === 'verifying' && (
          <p role="status" className="text-sm text-stone-600">
            Checking {status.fileName}…
          </p>
        )}
        {status.step === 'error' && <FormAlert tone="error">{status.message}</FormAlert>}

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept={acceptFor(kind)}
            disabled={busy}
            aria-describedby={hint ? hintId : undefined}
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              if (file) void upload(file);
            }}
            className="text-sm file:mr-3 file:rounded-sm file:border file:border-stone-300 file:bg-white file:px-3 file:py-1.5 file:text-sm hover:file:bg-stone-100"
          />
          {value && removable && !busy && (
            <button
              type="button"
              className={button}
              onClick={() => {
                onChange(null);
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {hint && (
        <p id={hintId} className="text-sm text-stone-600">
          {hint}
        </p>
      )}
    </div>
  );
}
