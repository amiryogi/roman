import { describe, expect, it } from 'vitest';

import { createTestMedia } from '../../../test/app.js';
import { useTestDb } from '../../../test/db.js';
import { silentLogger } from '../../config/logger.js';
import { VideoModel } from '../../modules/videos/model.js';
import { matchSongsToVideos, seedShowcaseVideos, type TitleLookup } from './showcaseVideos.js';

useTestDb();

// The titles YouTube reported on 2026-10-27 (Unko Sweater in Nepali only, Haalkhabar spelt so).
const TITLES: Record<string, string> = {
  JqZ7Owwt2Cw:
    'Kafle [काफ्ले] Movie Song [ऊनको स्वीटर] Jhuma Limbu | Sujan Chapagain | In Cinemas Baisakh 26/May 09',
  tVs5gi5vw6w: 'Makhamali -The Hulaki | Official Music Video',
  wrYPBpgUchg: 'Yabesh Thapa - Haalkhabar | OFFICIAL MUSIC VIDEO',
};
const lookup: TitleLookup = (id) => Promise.resolve(TITLES[id] ?? 'Unknown');

describe('showcase videos', () => {
  it('matches each song to the video YouTube names after it, in any script or spelling', async () => {
    const songs = await matchSongsToVideos(lookup);
    expect(songs.map((song) => [song.title, song.youtubeId])).toEqual([
      ['Unko Sweater', 'JqZ7Owwt2Cw'],
      ['Makhamali', 'tVs5gi5vw6w'],
      ['Halkhabar', 'wrYPBpgUchg'],
    ]);
  });

  it('refuses when a song matches no video, or several', async () => {
    await expect(matchSongsToVideos(() => Promise.resolve('Something else'))).rejects.toThrow(
      /Unko Sweater/,
    );
    await expect(
      matchSongsToVideos(() => Promise.resolve('Makhamali and Haalkhabar, ऊनको स्वीटर')),
    ).rejects.toThrow(/Could not tell/);
  });

  it('adds published showcase videos once and keeps owner edits', async () => {
    const media = createTestMedia();
    const first = await seedShowcaseVideos({ media, logger: silentLogger, lookup });
    expect(first.created).toEqual(['Unko Sweater', 'Makhamali', 'Halkhabar']);

    const unko = await VideoModel.findOne({ youtubeId: 'JqZ7Owwt2Cw' }).lean().orFail();
    expect(unko).toMatchObject({
      title: 'Unko Sweater',
      description: 'From the film Kafle, sung by Jhuma Limbu',
      source: 'youtube',
      category: 'studio',
      status: 'published',
      showcase: true,
    });

    await VideoModel.updateOne({ _id: unko._id }, { $set: { title: 'Edited by the owner' } });
    const second = await seedShowcaseVideos({ media, logger: silentLogger, lookup });
    expect(second).toEqual({ created: [], kept: ['Unko Sweater', 'Makhamali', 'Halkhabar'] });
    expect(await VideoModel.countDocuments()).toBe(3);
    expect((await VideoModel.findById(unko._id).orFail()).title).toBe('Edited by the owner');
  });
});
