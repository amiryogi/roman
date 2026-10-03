import { Link } from 'react-router';

import type { GalleryImageDto } from '@roman/shared';

import {
  ContentListPage,
  type ContentListConfig,
} from '@/features/admin/components/ContentListPage';
import {
  adminKeys,
  deleteGalleryImage,
  listGallery,
  reorderGallery,
  updateGalleryImage,
} from '@/lib/api/admin';
import { getMediaUrls } from '@/lib/cloudinary';
import { queryKeys } from '@/lib/api/public';
import { GALLERY_CATEGORY_LABELS } from '@/lib/labels';

/** Photos have no title; the start of the alt text names them in lists and messages. */
function shortLabel(photo: GalleryImageDto): string {
  return photo.alt.length > 60 ? `${photo.alt.slice(0, 57)}…` : photo.alt;
}

const config: ContentListConfig<GalleryImageDto> = {
  title: 'Gallery',
  noun: 'photo',
  newPath: '/admin/gallery/upload',
  newLabel: 'Upload photos',
  listKey: adminKeys.galleryList,
  list: listGallery,
  invalidate: [adminKeys.gallery, ['gallery'], queryKeys.home],
  update: updateGalleryImage,
  remove: deleteGalleryImage,
  reorder: reorderGallery,
  label: shortLabel,
  editPath: (photo) => `/admin/gallery/${photo.id}`,
  columns: [
    {
      header: 'Photo',
      cell: (photo) => (
        <div className="flex items-center gap-3">
          <img
            src={getMediaUrls().imageUrl(photo.image, { crop: 'fill', width: 160, height: 160 })}
            alt=""
            width={56}
            height={56}
            className="size-14 shrink-0 rounded-sm object-cover"
            style={
              photo.image.dominantColor ? { backgroundColor: photo.image.dominantColor } : undefined
            }
          />
          <Link
            to={`/admin/gallery/${photo.id}`}
            className="line-clamp-2 underline-offset-4 hover:underline"
          >
            {photo.alt}
          </Link>
        </div>
      ),
    },
    { header: 'Category', wide: true, cell: (photo) => GALLERY_CATEGORY_LABELS[photo.category] },
  ],
  deleteMessage: (photo) =>
    `“${shortLabel(photo)}” will be deleted, with its image file. This can’t be undone.`,
  searchLabel: 'Search descriptions and captions',
  emptyMessage: 'No photos yet. Upload some.',
};

export function GalleryAdminPage() {
  return <ContentListPage config={config} />;
}
