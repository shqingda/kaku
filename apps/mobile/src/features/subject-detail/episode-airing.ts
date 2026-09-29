export function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// 上游只提供日期时，“今日放送”不承诺具体时刻已经播出。
export function episodeAiringLabel(airDate?: string, today = todayDateString()) {
  const day = airDate?.slice(0, 10);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return '时间待定';
  const parsed = new Date(`${day}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) return '时间待定';
  if (day === today) return '今日放送';
  return day < today ? '已放送' : '未放送';
}

// 保持现有高亮规则：已放送或今日放送。
export function isEpisodeAired(airDate?: string, today = todayDateString()) {
  const label = episodeAiringLabel(airDate, today);
  return label === '已放送' || label === '今日放送';
}
