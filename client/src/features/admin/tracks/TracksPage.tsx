import { Link } from 'react-router';

import type { TrackDto } from '@roman/shared';

import {
  ContentListPage,
  type ContentListConfig,
} from '@/features/admin/components/ContentListPage';
import { formatDuration } from '@/features/audio/duration';
import { TrackArtwork } from '@/features/audio/TrackArtwork';
import { adminKeys, deleteTrack, listTracks, reorderTracks, updateTrack } from '@/lib/api/admin';
import { queryKeys } from '@/lib/api/public';

const config: ContentListConfig<TrackDto> = {
  title: 'Tracks',
  noun: 'track',
  newPath: '/admin/tracks/new',
  newLabel: 'Add track',
  listKey: adminKeys.trackList,
  list: listTracks,
  invalidate: [adminKeys.tracks, adminKeys.albums, queryKeys.tracks, queryKeys.home],
  update: updateTrack,
  remove: deleteTrack,
  reorder: reorderTracks,
  label: (track) => track.title,
  editPath: (track) => `/admin/tracks/${track.id}`,
  columns: [
    {
      header: 'Track',
      cell: (track) => (
        <div className="flex items-center gap-3">
          <TrackArtwork track={track} size={40} />
          <div className="min-w-0">
            <Link
              to={`/admin/tracks/${track.id}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {track.title}
            </Link>
            {track.album && <p className="text-xs text-stone-600">{track.album.title}</p>}
          </div>
        </div>
      ),
    },
    {
      header: 'Length',
      wide: true,
      cell: (track) => formatDuration(track.duration),
      className: 'tabular-nums',
    },
  ],
  deleteMessage: (track) =>
    `“${track.title}” and its audio file will be deleted. This can’t be undone.`,
  searchLabel: 'Search titles',
  emptyMessage: 'No tracks yet. Add the first one.',
};

export function TracksPage() {
  return <ContentListPage config={config} />;
}
