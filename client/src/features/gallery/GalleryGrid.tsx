import { lazy, Suspense, useState } from 'react';

import type { GalleryImageDto } from '@roman/shared';

import { ResponsiveImage } from '@/components/media/ResponsiveImage';

import { GALLERY_IMAGE_SIZES } from './galleryLayout';

// The viewer and its styles load on the first click only (plan §16).
const GalleryLightbox = lazy(() => import('./GalleryLightbox'));

/**
 * Masonry grid (plan §6). Each image keeps its natural shape and declares its size, so nothing
 * shifts while photos load (plan §16). Opening a photo shows it in the viewer.
 */
export function GalleryGrid({ images }: { images: GalleryImageDto[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3">
        {images.map((photo, index) => (
          <li key={photo.id} className="mb-4 break-inside-avoid">
            <figure>
              <button
                type="button"
                onClick={() => {
                  setOpen(index);
                }}
                className="block w-full overflow-hidden rounded-sm"
              >
                <ResponsiveImage
                  asset={photo.image}
                  alt={photo.alt}
                  sizes={GALLERY_IMAGE_SIZES}
                  // The first photo is the top of the first column at every width: the page's
                  // largest image (LCP), so it loads eagerly at high priority.
                  priority={index === 0}
                  className="h-auto w-full transition-transform duration-500 hover:scale-[1.02] motion-reduce:transition-none"
                />
                <span className="sr-only"> (open in viewer)</span>
              </button>
              {(photo.caption ?? photo.photographerCredit) && (
                <figcaption className="mt-2 text-sm text-(--muted)">
                  {photo.caption}
                  {photo.caption && photo.photographerCredit && ' · '}
                  {photo.photographerCredit && `Photo: ${photo.photographerCredit}`}
                </figcaption>
              )}
            </figure>
          </li>
        ))}
      </ul>
      {open !== null && (
        <Suspense fallback={null}>
          <GalleryLightbox
            images={images}
            index={open}
            onClose={() => {
              setOpen(null);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
