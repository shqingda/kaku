import Storage from 'expo-sqlite/kv-store';

const HOME_TYPE_KEY = 'kaku:view:home-type:v1';
const EPISODE_LAYOUT_KEY = 'kaku:view:episode-layout:v1';
const TRACKING_TYPES = [1, 2, 3, 4, 6];
export type EpisodeLayout = 'grid' | 'list';

function read(key: string) {
  try { return Storage.getItemSync(key); }
  catch { return null; }
}
function write(key: string, value: string) {
  try { Storage.setItemSync(key, value); }
  catch { /* Convenience preferences do not block the current selection. */ }
}
export function readHomeTrackingType() {
  const value = Number(read(HOME_TYPE_KEY));
  return TRACKING_TYPES.includes(value) ? value : 2;
}
export function saveHomeTrackingType(value: number) {
  if (TRACKING_TYPES.includes(value)) write(HOME_TYPE_KEY, String(value));
}
export function readEpisodeLayout(): EpisodeLayout {
  return read(EPISODE_LAYOUT_KEY) === 'list' ? 'list' : 'grid';
}
export function saveEpisodeLayout(value: EpisodeLayout) {
  write(EPISODE_LAYOUT_KEY, value);
}
