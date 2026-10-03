import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UploadSignatureDto } from '@roman/shared';

import { createQueryClient } from '@/app/queryClient';
import { createGalleryImage } from '@/lib/api/admin';
import type * as AdminApi from '@/lib/api/admin';
import { getUploadSignature, verifyUpload } from '@/lib/api/uploads';
import { uploadToCloudinary } from '@/lib/cloudinaryUpload';
import type * as CloudinaryUpload from '@/lib/cloudinaryUpload';
import { imageAsset, photoFixture } from '@/test/fixtures';

import { GalleryUploadPage } from './GalleryUploadPage';

vi.mock('@/lib/api/uploads', () => ({ getUploadSignature: vi.fn(), verifyUpload: vi.fn() }));
vi.mock('@/lib/cloudinaryUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof CloudinaryUpload>()),
  uploadToCloudinary: vi.fn(),
}));
vi.mock('@/lib/api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof AdminApi>()),
  createGalleryImage: vi.fn(),
}));

const SIGNATURE: UploadSignatureDto = {
  kind: 'gallery',
  cloudName: 'test-cloud',
  apiKey: '1',
  timestamp: 1,
  signature: 's',
  uploadUrl: 'https://api.cloudinary.com/v1_1/test-cloud/image/upload',
  params: {},
  constraints: { resourceType: 'image', allowedFormats: ['jpg'], maxBytes: 10_000_000 },
};

function renderPage() {
  const router = createMemoryRouter([{ path: '/', element: <GalleryUploadPage /> }]);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

const photo = (name: string) => new File([new Uint8Array(100)], name, { type: 'image/jpeg' });

beforeEach(() => {
  let n = 0;
  vi.mocked(getUploadSignature).mockReset().mockResolvedValue(SIGNATURE);
  vi.mocked(uploadToCloudinary)
    .mockReset()
    .mockImplementation(() => {
      n += 1;
      return Promise.resolve({ publicId: `root/gallery/p${String(n)}`, resourceType: 'image' });
    });
  vi.mocked(verifyUpload)
    .mockReset()
    .mockImplementation((_kind, ref) => Promise.resolve(imageAsset({ publicId: ref.publicId })));
  vi.mocked(createGalleryImage).mockReset().mockResolvedValue(photoFixture());
});

describe('bulk photo upload', () => {
  it('uploads several photos and saves only those with alt text, as drafts', async () => {
    renderPage();

    await userEvent.upload(screen.getByLabelText(/Choose photos/), [
      photo('a.jpg'),
      photo('b.jpg'),
    ]);
    const save = await screen.findByRole('button', { name: 'Save all ready photos (2)' });

    const [firstAlt] = screen.getAllByLabelText('Description (alt text, required)');
    if (!firstAlt) throw new Error('no alt field');
    await userEvent.type(firstAlt, 'Violinist on stage at night');
    await userEvent.click(save);

    expect(createGalleryImage).toHaveBeenCalledTimes(1);
    expect(createGalleryImage).toHaveBeenCalledWith(
      expect.objectContaining({
        image: { publicId: 'root/gallery/p1', resourceType: 'image' },
        alt: 'Violinist on stage at night',
        category: 'performance',
        status: 'draft',
      }),
    );
    expect(await screen.findByText('Saved as a draft.')).toBeInTheDocument();
    // The photo without a description stays, with an explanation.
    const rows = screen.getAllByRole('listitem');
    expect(
      within(rows[1] ?? document.body).getByText('Describe the image in at least 5 characters'),
    ).toBeInTheDocument();
  });

  it('rejects files that are not images before uploading', async () => {
    renderPage();

    await userEvent.upload(
      screen.getByLabelText(/Choose photos/),
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
      { applyAccept: false },
    );

    expect(await screen.findByRole('alert')).toHaveTextContent(/can't be used/);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });
});
