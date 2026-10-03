import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/styles.css';

import type { GalleryImageDto } from '@roman/shared';

import { getMediaUrls, responsiveWidths } from '@/lib/cloudinary';

interface GalleryLightboxProps {
  images: GalleryImageDto[];
  index: number;
  onClose: () => void;
}

/**
 * Full-screen viewer (plan §12.6), loaded only when a photo is first opened. The library brings
 * keyboard and swipe navigation, a focus trap and Esc to close. Captions and photographer credits
 * are shown as text.
 */
export default function GalleryLightbox({ images, index, onClose }: GalleryLightboxProps) {
  const urls = getMediaUrls();
  const slides = images.map((photo) => {
    const width = photo.image.width ?? 1600;
    const height = photo.image.height ?? 1067;
    return {
      src: urls.imageUrl(photo.image, { crop: 'limit', width: Math.min(width, 1600) }),
      alt: photo.alt,
      width,
      height,
      srcSet: responsiveWidths(width, [640, 1024, 1600, 2400]).map((w) => ({
        src: urls.imageUrl(photo.image, { crop: 'limit', width: w }),
        width: w,
        height: Math.round((height * w) / width),
      })),
      title: photo.caption,
      description: photo.photographerCredit ? `Photo: ${photo.photographerCredit}` : undefined,
    };
  });

  return (
    <Lightbox
      open
      index={index}
      close={onClose}
      slides={slides}
      plugins={[Captions]}
      captions={{ descriptionTextAlign: 'center' }}
      controller={{ closeOnBackdropClick: true }}
      labels={{ Previous: 'Previous photo', Next: 'Next photo', Close: 'Close' }}
    />
  );
}
