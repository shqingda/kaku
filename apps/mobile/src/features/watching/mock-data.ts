import type { WatchingItem } from './model';

function createWeeklyAirDates(firstAirDate: string, totalEpisodes: number) {
  const firstDate = new Date(`${firstAirDate}T12:00:00Z`);

  return Array.from({ length: totalEpisodes }, (_, index) => {
    const airDate = new Date(firstDate);
    airDate.setUTCDate(firstDate.getUTCDate() + index * 7);
    return airDate.toISOString().slice(0, 10);
  });
}

// 以后 Bangumi adapter 返回的数据会转换成 WatchingItem，UI 不直接依赖 API 字段。
export const INITIAL_WATCHING_ITEMS: WatchingItem[] = [
  {
    id: 400602,
    title: '葬送的芙莉莲',
    coverUrl: 'https://lain.bgm.tv/r/400/pic/cover/l/13/c5/400602_ZI8Y9.jpg',
    watchedEpisodeNumbers: [1, 2, 3, 4, 5, 6, 7, 8],
    totalEpisodes: 28,
    year: 2023,
    summary: '勇者一行击败魔王之后，精灵魔法使芙莉莲重新理解时间、记忆与同行者。',
    episodeAirDates: createWeeklyAirDates('2023-09-29', 28),
  },
  {
    id: 467461,
    title: '胆大党',
    coverUrl: 'https://lain.bgm.tv/r/400/pic/cover/l/44/7d/467461_HHw4K.jpg',
    watchedEpisodeNumbers: [1, 2, 3, 4, 5],
    totalEpisodes: 12,
    year: 2024,
    summary: '相信幽灵的少女与相信外星人的少年，为证明彼此而卷入接连不断的怪异事件。',
    episodeAirDates: createWeeklyAirDates('2024-10-03', 12),
  },
  {
    id: 395378,
    title: '迷宫饭',
    coverUrl: 'https://lain.bgm.tv/r/400/pic/cover/l/c5/88/395378_jztpO.jpg',
    watchedEpisodeNumbers: Array.from({ length: 20 }, (_, index) => index + 1),
    totalEpisodes: 24,
    year: 2024,
    summary: '冒险者莱欧斯一行深入迷宫，一边营救同伴，一边研究如何烹饪沿途的魔物。',
    episodeAirDates: createWeeklyAirDates('2024-01-04', 24),
  },
];
