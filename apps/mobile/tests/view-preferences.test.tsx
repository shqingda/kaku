import { cleanup, fireEvent, render, screen } from '@testing-library/react-native';
import { EpisodeSection } from '@/features/subject-detail/episode-section';
import { ThemeProvider } from '@/features/theme/theme-provider';
import { readHomeTrackingType, saveHomeTrackingType } from '@/features/preferences/view-preferences';
const mockStorage = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: {
  getItemSync: (key: string) => mockStorage.get(key) ?? null,
  setItemSync: (key: string, value: string) => mockStorage.set(key, value),
} }));
const props = { episodes: [], fallbackAirDates: [], totalEpisodes: 1, watchedEpisodeNumbers: [], onOpenEpisode: jest.fn() };
beforeEach(() => mockStorage.clear());
afterEach(async () => { await cleanup(); });
test('episode layout survives remount while music still uses a track list', async () => {
  const view = await render(<ThemeProvider><EpisodeSection {...props} /></ThemeProvider>);
  await fireEvent.press(screen.getByLabelText('列表布局'));
  await view.unmount();
  const restored = await render(<ThemeProvider><EpisodeSection {...props} /></ThemeProvider>);
  expect(screen.getByLabelText('列表布局').props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByLabelText('格子布局'));
  await restored.unmount();
  await render(<ThemeProvider><EpisodeSection {...props} kind="track" /></ThemeProvider>);
  expect(screen.queryByLabelText('格子布局')).toBeNull();
  expect(screen.getByText('时长待定')).toBeTruthy();
});
test('home type restores a valid choice and falls back for obsolete stored values', () => {
  expect(readHomeTrackingType()).toBe(2);
  saveHomeTrackingType(4);
  expect(readHomeTrackingType()).toBe(4);
  mockStorage.set('kaku:view:home-type:v1', '999');
  expect(readHomeTrackingType()).toBe(2);
});
