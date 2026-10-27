import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { sheetMusicDtoSchema, type SheetMusicDto } from '@roman/shared';

import { createQueryClient } from '@/app/queryClient';
import type { MediaUploaderProps } from '@/features/admin/components/MediaUploader';
import { createSheetMusic, getSheetMusic, updateSheetMusic } from '@/lib/api/admin';
import type * as AdminApi from '@/lib/api/admin';
import { imageAsset } from '@/test/fixtures';

import { SheetMusicEditPage } from './SheetMusicEditPage';

const preview = imageAsset({ publicId: 'root/scores/opening' });

vi.mock('@/features/admin/components/MediaUploader', () => ({
  MediaUploader: ({ label, onChange }: MediaUploaderProps) => (
    <button
      type="button"
      onClick={() => {
        onChange(preview);
      }}
    >
      Upload: {label}
    </button>
  ),
}));

vi.mock('@/lib/api/admin', async (importOriginal) => ({
  ...(await importOriginal<typeof AdminApi>()),
  createSheetMusic: vi.fn(),
  updateSheetMusic: vi.fn(),
  getSheetMusic: vi.fn(),
}));

// Neutral test data, not facts about Roman.
function scoreFixture(overrides: Partial<SheetMusicDto> = {}): SheetMusicDto {
  return sheetMusicDtoSchema.parse({
    id: 'score-1',
    title: 'Test Waltz',
    slug: 'test-waltz',
    artist: 'A Composer',
    level: 'beginner',
    status: 'published',
    featured: false,
    sortOrder: 1,
    createdAt: '2026-10-27T12:00:00.000Z',
    updatedAt: '2026-10-27T12:00:00.000Z',
    ...overrides,
  });
}

function renderEditor(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/admin/sheet-music/:id', element: <SheetMusicEditPage /> },
      { path: '/admin/sheet-music', element: <h1>Score list</h1> },
    ],
    { initialEntries: [path] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(createSheetMusic).mockReset().mockResolvedValue(scoreFixture());
  vi.mocked(updateSheetMusic).mockReset().mockResolvedValue(scoreFixture());
  vi.mocked(getSheetMusic).mockReset().mockResolvedValue(scoreFixture());
});

describe('sheet music editor', () => {
  it('adds a score with a level, preview and alt text', async () => {
    renderEditor('/admin/sheet-music/new');

    await userEvent.type(await screen.findByLabelText('Song title'), 'Test Waltz');
    await userEvent.selectOptions(screen.getByLabelText('Level (optional)'), 'Intermediate');
    await userEvent.click(screen.getByRole('button', { name: 'Upload: Preview (optional)' }));
    await userEvent.type(
      screen.getByLabelText('Preview description (alt text)'),
      'The opening bars of the violin part',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save score' }));

    await screen.findByRole('heading', { name: 'Score list' });
    const [payload] = vi.mocked(createSheetMusic).mock.calls[0] ?? [];
    expect(payload).toMatchObject({
      title: 'Test Waltz',
      level: 'intermediate',
      preview: {
        mediaRef: { publicId: 'root/scores/opening', resourceType: 'image' },
        alt: 'The opening bars of the violin part',
      },
    });
  });

  it('clears the level and the artist of an existing score', async () => {
    renderEditor('/admin/sheet-music/score-1');

    await userEvent.selectOptions(await screen.findByLabelText('Level (optional)'), 'Not set');
    await userEvent.clear(screen.getByLabelText('Artist or composer (optional)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save score' }));

    await screen.findByRole('heading', { name: 'Score list' });
    const [id, payload] = vi.mocked(updateSheetMusic).mock.calls[0] ?? [];
    expect(id).toBe('score-1');
    expect(payload).toMatchObject({ level: null, artist: null });
  });

  it('asks for an https store link', async () => {
    renderEditor('/admin/sheet-music/new');

    await userEvent.type(await screen.findByLabelText('Song title'), 'Reel');
    await userEvent.type(screen.getByLabelText('Store link (optional)'), 'http://shop.example');
    await userEvent.click(screen.getByRole('button', { name: 'Save score' }));

    expect(await screen.findByText('Must be an https:// URL')).toBeInTheDocument();
    expect(createSheetMusic).not.toHaveBeenCalled();
  });
});
