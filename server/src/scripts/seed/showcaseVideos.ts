import { videoCreateInputSchema } from '@roman/shared';

import type { Logger } from '../../config/logger.js';
import { VideoModel } from '../../modules/videos/model.js';
import { createVideo } from '../../modules/videos/service.js';
import type { MediaService } from '../../services/media/MediaService.js';

/**
 * The songs Roman played violin on, as listed under "Songs I've played on" on the owner's
 * reference page (2026-10-27), with their credit lines exactly as written there.
 */
export const SHOWCASE_SONGS = [
  { title: 'Unko Sweater', description: 'From the film Kafle, sung by Jhuma Limbu' },
  { title: 'Makhamali', description: 'The Hulaki' },
  { title: 'Halkhabar', description: 'Yabesh Thapa' },
] as const;

/** The YouTube videos that reference page embeds for them, in page order. */
export const SHOWCASE_YOUTUBE_IDS = ['JqZ7Owwt2Cw', 'tVs5gi5vw6w', 'wrYPBpgUchg'] as const;

/** Looks up a YouTube video's own title (the oEmbed endpoint needs no API key). */
export type TitleLookup = (youtubeId: string) => Promise<string>;

export const youtubeTitle: TitleLookup = async (youtubeId) => {
  const watch = `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeId)}`;
  const res = await fetch(
    `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(watch)}`,
  );
  if (!res.ok) throw new Error(`YouTube has no public video ${youtubeId} (${String(res.status)})`);
  const body: unknown = await res.json();
  if (typeof body === 'object' && body !== null && 'title' in body) {
    if (typeof body.title === 'string') return body.title;
  }
  throw new Error(`YouTube returned no title for ${youtubeId}`);
};

function normalise(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Pairs each song with the video whose YouTube title names it, so a song can never be saved on
 * the wrong video. Fails unless every song matches exactly one video.
 */
export async function matchSongsToVideos(
  lookup: TitleLookup,
): Promise<{ title: string; description: string; youtubeId: string }[]> {
  const titles = await Promise.all(
    SHOWCASE_YOUTUBE_IDS.map(async (youtubeId) => ({ youtubeId, title: await lookup(youtubeId) })),
  );
  return SHOWCASE_SONGS.map((song) => {
    const matches = titles.filter((video) =>
      normalise(video.title).includes(normalise(song.title)),
    );
    const [match] = matches;
    if (!match || matches.length > 1) {
      const found = titles.map((video) => `${video.youtubeId}: ${video.title}`).join('; ');
      throw new Error(`Could not tell which video is "${song.title}" (YouTube titles: ${found})`);
    }
    return { ...song, youtubeId: match.youtubeId };
  });
}

export interface ShowcaseSeedSummary {
  created: string[];
  kept: string[];
}

/**
 * Adds the songs as published YouTube videos listed under "Songs I've played on" (and on the
 * Videos page, category Studio). Safe to run again: a video already saved with the same YouTube ID
 * is left exactly as the owner last edited it.
 */
export async function seedShowcaseVideos({
  media,
  logger,
  lookup = youtubeTitle,
}: {
  media: MediaService;
  logger: Logger;
  lookup?: TitleLookup;
}): Promise<ShowcaseSeedSummary> {
  const summary: ShowcaseSeedSummary = { created: [], kept: [] };
  for (const song of await matchSongsToVideos(lookup)) {
    if (await VideoModel.exists({ youtubeId: song.youtubeId })) {
      summary.kept.push(song.title);
      continue;
    }
    // Same validation as the admin form.
    const input = videoCreateInputSchema.parse({
      source: 'youtube',
      youtube: song.youtubeId,
      title: song.title,
      description: song.description,
      category: 'studio',
      status: 'published',
      featured: false,
      showcase: true,
    });
    await createVideo(input, { media, logger });
    summary.created.push(song.title);
  }
  return summary;
}
