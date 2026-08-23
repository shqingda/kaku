export function todayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

// 已放送，或当日即将放送（从当天 0:00 起即视为“已放送”色）。
export function isEpisodeAired(airDate?: string, today = todayDateString()) {
  if (!airDate) return false;

  const datePart = airDate.slice(0, 10);
  if (datePart.length < 10) return false;

  return datePart <= today;
}
