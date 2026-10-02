import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MediaAssetDto, UploadSignatureDto } from '@roman/shared';

import { getUploadSignature, verifyUpload } from '@/lib/api/uploads';
import type * as CloudinaryUpload from '@/lib/cloudinaryUpload';
import { uploadToCloudinary, UploadError } from '@/lib/cloudinaryUpload';

import { MediaUploader } from './MediaUploader';

vi.mock('@/lib/api/uploads', () => ({
  getUploadSignature: vi.fn(),
  verifyUpload: vi.fn(),
}));

vi.mock('@/lib/cloudinaryUpload', async (importOriginal) => ({
  ...(await importOriginal<typeof CloudinaryUpload>()),
  uploadToCloudinary: vi.fn(),
}));

const SIGNATURE: UploadSignatureDto = {
  kind: 'gallery',
  cloudName: 'demo-cloud',
  apiKey: '1234',
  timestamp: 1,
  signature: 'abc',
  uploadUrl: 'https://api.cloudinary.com/v1_1/demo-cloud/image/upload',
  params: {},
  constraints: { resourceType: 'image', allowedFormats: ['jpg'], maxBytes: 1000 },
};

const VERIFIED: MediaAssetDto = {
  publicId: 'root/gallery/abc',
  resourceType: 'image',
  version: 2,
  format: 'jpg',
  bytes: 640,
  width: 1200,
  height: 800,
  originalFilename: 'stage',
};

function Harness({ onChange }: { onChange: (asset: MediaAssetDto | null) => void }) {
  const [value, setValue] = useState<MediaAssetDto | null>(null);
  return (
    <MediaUploader
      kind="gallery"
      label="Photo"
      value={value}
      onChange={(asset) => {
        setValue(asset);
        onChange(asset);
      }}
      removable
    />
  );
}

const photo = (size = 100, name = 'stage.jpg') => new File([new Uint8Array(size)], name);

beforeEach(() => {
  vi.mocked(getUploadSignature).mockReset().mockResolvedValue(SIGNATURE);
  vi.mocked(verifyUpload).mockReset().mockResolvedValue(VERIFIED);
  vi.mocked(uploadToCloudinary)
    .mockReset()
    .mockResolvedValue({ publicId: VERIFIED.publicId, resourceType: 'image' });
});

describe('MediaUploader', () => {
  it('uploads, verifies and reports the verified asset', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.upload(screen.getByLabelText('Photo'), photo());

    expect(await screen.findByText('stage')).toBeInTheDocument();
    expect(screen.getByText('JPG · 1 KB · 1200×800')).toBeInTheDocument();
    expect(getUploadSignature).toHaveBeenCalledWith('gallery');
    expect(verifyUpload).toHaveBeenCalledWith('gallery', {
      publicId: VERIFIED.publicId,
      resourceType: 'image',
    });
    expect(onChange).toHaveBeenLastCalledWith(VERIFIED);

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('rejects a file over the server limit without uploading it', async () => {
    render(<Harness onChange={vi.fn()} />);

    await userEvent.upload(screen.getByLabelText('Photo'), photo(5000));

    expect(await screen.findByRole('alert')).toHaveTextContent(/limit/);
    expect(uploadToCloudinary).not.toHaveBeenCalled();
  });

  it('shows upload errors', async () => {
    vi.mocked(uploadToCloudinary).mockRejectedValue(
      new UploadError("This file type isn't allowed here."),
    );
    render(<Harness onChange={vi.fn()} />);

    await userEvent.upload(screen.getByLabelText('Photo'), photo());

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "This file type isn't allowed here.",
    );
    expect(verifyUpload).not.toHaveBeenCalled();
  });
});
