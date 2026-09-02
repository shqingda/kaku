const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function padTime(value: number) {
  return String(value).padStart(2, '0');
}

export function formatActivityTime(
  unixSeconds: number,
  nowMilliseconds = Date.now(),
) {
  const date = new Date(unixSeconds * 1000);
  const elapsedMilliseconds = Math.max(
    0,
    nowMilliseconds - date.getTime(),
  );

  if (elapsedMilliseconds < DAY_MS) {
    const totalMinutes = Math.max(
      1,
      Math.floor(elapsedMilliseconds / MINUTE_MS),
    );
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours === 0) {
      return `${minutes} 分钟前`;
    }

    return minutes > 0
      ? `${hours} 小时 ${minutes} 分钟前`
      : `${hours} 小时前`;
  }

  if (elapsedMilliseconds < 3 * DAY_MS) {
    const totalHours = Math.floor(elapsedMilliseconds / HOUR_MS);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;

    return hours > 0 ? `${days} 天 ${hours} 小时前` : `${days} 天前`;
  }

  return [
    `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
    `${padTime(date.getHours())}:${padTime(date.getMinutes())}`,
  ].join(' ');
}
