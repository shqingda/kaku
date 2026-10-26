import { getBangumiEpisodes, getBangumiSubject } from '@/infrastructure/bangumi/api-v0/client';
import { getCatalogSubject } from '@/infrastructure/bangumi/catalog/provider';

jest.mock('@/infrastructure/bangumi/api-v0/client', () => ({
  getBangumiEpisodes: jest.fn(),
  getBangumiSubject: jest.fn(),
}));

const images = {
  common: 'https://lain.bgm.tv/r/400/pic/cover/l/1.jpg',
  grid: 'https://lain.bgm.tv/r/100/pic/cover/l/1.jpg',
  large: 'https://lain.bgm.tv/pic/cover/l/1.jpg',
  medium: 'https://lain.bgm.tv/r/800/pic/cover/l/1.jpg',
  small: 'https://lain.bgm.tv/r/200/pic/cover/l/1.jpg',
};

function mockSubject(subjectImages: Partial<typeof images>) {
  jest.mocked(getBangumiSubject).mockResolvedValue({
    date: '2024-01-01',
    eps: 0,
    id: 1,
    images: subjectImages,
    name: 'Book',
    name_cn: '',
    summary: '',
    total_episodes: 0,
    type: 1,
  } as unknown as Awaited<ReturnType<typeof getBangumiSubject>>);
  jest.mocked(getBangumiEpisodes).mockResolvedValue([]);
}

test('the subject hero uses the resized cover and keeps the original for fullscreen', async () => {
  mockSubject(images);

  const subject = await getCatalogSubject(1);

  expect(subject.coverUrl).toBe(images.large);
  expect(subject.thumbnailUrl).toBe(images.medium);
});

test('the subject hero falls back to the original when no resized cover exists', async () => {
  mockSubject({ large: images.large });

  const subject = await getCatalogSubject(1);

  expect(subject.thumbnailUrl).toBe(images.large);
});
