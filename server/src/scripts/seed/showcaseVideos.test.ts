import { describe, expect, it } from 'vitest';

import { createTestMedia } from '../../../test/app.js';
import { useTestDb } from '../../../test/db.js';
import { silentLogger } from '../../config/logger.js';
import { VideoModel } from '../../modules/videos/model.js';
import { matchSongsToVideos, seedShowcaseVideos, type TitleLookup } from './showcaseVideos.js';

useTestDb();

// What YouTube reports for each video, deliberately not in page order.
const TITLES: Record<string, string> = {
  JqZ7Owwt2Cw: 'MAKHAMALI - The Hulaki (Official Video)',
  tVs5gi5vw6w: 'Halkhabar | Yabesh Thapa',
  wrYPBpgUchg: 'UNKO SWEATER | Kafle Movie Song',
};
const lookup: TitleLookup = (id) => Promise.resolve(TITLES[id] ?? 'Unknown');

describe('showcase videos', () => {
  it('matches each song to the video YouTube names after it', async () => {
    const songs = await matchSongsToVideos(lookup);
    expect(songs.map((song) => [song.title, song.youtubeId])).toEqual([
      ['Unko Sweater', 'wrYPBpgUchg'],
      ['Makhamali', 'JqZ7Owwt2Cw'],
      ['Halkhabar', 'tVs5gi5vw6w'],
    ]);
  });

  it('refuses when a song matches no video', async () => {
    await expect(matchSongsToVideos(() => Promise.resolve('Something else'))).rejects.toThrow(
      /Unko Sweater/,
    );
  });

  it('adds published showcase videos once and keeps owner edits', async () => {
    const media = createTestMedia();
    const first = await seedShowcaseVideos({ media, logger: silentLogger, lookup });
    expect(first.created).toEqual(['Unko Sweater', 'Makhamali', 'Halkhabar']);

    const unko = await VideoModel.findOne({ youtubeId: 'wrYPBpgUchg' }).lean().orFail();
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
