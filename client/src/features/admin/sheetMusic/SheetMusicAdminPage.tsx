import { Link } from 'react-router';

import type { SheetMusicDto } from '@roman/shared';

import {
  ContentListPage,
  type ContentListConfig,
} from '@/features/admin/components/ContentListPage';
import {
  adminKeys,
  deleteSheetMusic,
  listSheetMusic,
  reorderSheetMusic,
  updateSheetMusic,
} from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/public';
import { getMediaUrls } from '@/lib/cloudinary';
import { SHEET_MUSIC_LEVEL_LABELS } from '@/lib/labels';

const config: ContentListConfig<SheetMusicDto> = {
  title: 'Sheet music',
  noun: 'score',
  newPath: '/admin/sheet-music/new',
  newLabel: 'Add score',
  listKey: adminKeys.sheetMusicList,
  list: listSheetMusic,
  invalidate: [adminKeys.sheetMusic, queryKeys.sheetMusic, queryKeys.home],
  update: updateSheetMusic,
  remove: deleteSheetMusic,
  reorder: reorderSheetMusic,
  label: (score) => score.title,
  editPath: (score) => `/admin/sheet-music/${score.id}`,
  columns: [
    {
      header: 'Score',
      cell: (score) => (
        <div className="flex items-center gap-3">
          {score.preview ? (
            <img
              src={getMediaUrls().imageUrl(score.preview.asset, {
                crop: 'fill',
                width: 160,
                height: 100,
              })}
              alt=""
              width={64}
              height={40}
              className="h-10 w-16 shrink-0 rounded-sm bg-stone-200 object-cover"
            />
          ) : (
            <span aria-hidden="true" className="h-10 w-16 shrink-0 rounded-sm bg-stone-200" />
          )}
          <div className="min-w-0">
            <Link
              to={`/admin/sheet-music/${score.id}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {score.title}
            </Link>
            <p className="text-xs text-stone-600">
              {[score.artist, score.level && SHEET_MUSIC_LEVEL_LABELS[score.level]]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
          </div>
        </div>
      ),
    },
  ],
  deleteMessage: (score) =>
    `“${score.title}” will be removed from the site, with its preview image. This can’t be undone.`,
  searchLabel: 'Search titles',
  emptyMessage:
    'No scores yet. Add the songs you can send as sheet music; visitors request them through the contact form.',
};

/** Sheet music listings (2026-10 revamp). Visitors request a score; it isn't downloaded. */
export function SheetMusicAdminPage() {
  return <ContentListPage config={config} />;
}
