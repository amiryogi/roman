import { Link } from 'react-router';

import type { VideoDto } from '@roman/shared';

import {
  ContentListPage,
  type ContentListConfig,
} from '@/features/admin/components/ContentListPage';
import { formatDuration } from '@/features/audio/duration';
import { videoPosterUrl } from '@/features/videos/videoPoster';
import { adminKeys, deleteVideo, listVideos, reorderVideos, updateVideo } from '@/lib/api/admin';
import { getMediaUrls } from '@/lib/cloudinary';
import { queryKeys } from '@/lib/api/public';
import { VIDEO_CATEGORY_LABELS } from '@/lib/labels';

const config: ContentListConfig<VideoDto> = {
  title: 'Videos',
  noun: 'video',
  newPath: '/admin/videos/new',
  newLabel: 'Add video',
  listKey: adminKeys.videoList,
  list: listVideos,
  invalidate: [adminKeys.videos, ['videos'], queryKeys.home],
  update: updateVideo,
  remove: deleteVideo,
  reorder: reorderVideos,
  label: (video) => video.title,
  editPath: (video) => `/admin/videos/${video.id}`,
  columns: [
    {
      header: 'Video',
      cell: (video) => (
        <div className="flex items-center gap-3">
          <img
            src={videoPosterUrl(video, getMediaUrls(), 160)}
            alt=""
            width={64}
            height={36}
            className="h-9 w-16 shrink-0 rounded-sm bg-stone-200 object-cover"
          />
          <div className="min-w-0">
            <Link
              to={`/admin/videos/${video.id}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {video.title}
            </Link>
            <p className="text-xs text-stone-600">
              {video.source === 'youtube' ? 'YouTube' : 'Uploaded'} ·{' '}
              {VIDEO_CATEGORY_LABELS[video.category]}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Length',
      wide: true,
      cell: (video) => (video.duration === undefined ? '—' : formatDuration(video.duration)),
      className: 'tabular-nums',
    },
  ],
  deleteMessage: (video) =>
    video.source === 'cloudinary'
      ? `“${video.title}” and its video file will be deleted. This can’t be undone.`
      : `“${video.title}” will be removed from the site. The video stays on YouTube.`,
  searchLabel: 'Search titles',
  emptyMessage: 'No videos yet. Upload one or add a YouTube link.',
};

export function VideosPage() {
  return <ContentListPage config={config} />;
}
