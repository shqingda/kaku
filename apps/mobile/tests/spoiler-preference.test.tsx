import { act, cleanup, renderHook } from '@testing-library/react-native';
import { useSpoilerPreference } from '@/features/preferences/spoiler-preference';
let mockValue: string | null = null;
let mockFail = false;
jest.mock('expo-sqlite/kv-store', () => ({ __esModule: true, default: {
  getItemSync: () => mockValue,
  setItemSync: (_key: string, value: string) => { if (mockFail) throw new Error('disk'); mockValue = value; },
} }));
beforeEach(() => { mockValue = null; mockFail = false; });
afterEach(cleanup);
test('defaults off, notifies mounted readers, and failed writes preserve the saved setting', async () => {
  const settings = await renderHook(() => useSpoilerPreference());
  const episode = await renderHook(() => useSpoilerPreference());
  expect(settings.result.current.enabled).toBe(false);
  await act(() => settings.result.current.toggle());
  expect(episode.result.current.enabled).toBe(true);
  mockFail = true;
  await act(() => settings.result.current.toggle());
  expect(settings.result.current.error).toContain('未能保存');
  expect(episode.result.current.enabled).toBe(true);
});
