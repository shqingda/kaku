import { act, renderHook } from '@testing-library/react-native';

import { useEpisodeCommentScrollPosition } from '@/features/discussions/use-episode-comment-scroll-position';

const mockData = new Map<string, string>();
jest.mock('expo-sqlite/kv-store', () => ({
  getItemSync: jest.fn((key: string) => mockData.get(key) ?? null),
  removeItemSync: jest.fn((key: string) => mockData.delete(key)),
  setItemSync: jest.fn((key: string, value: string) => mockData.set(key, value)),
}));

beforeEach(() => mockData.clear());

describe('useEpisodeCommentScrollPosition', () => {
  it('restores and saves a position separately for each episode', async () => {
    mockData.set('kaku:episode-comment-scroll:v1:13', '640');
    const scrollToOffset = jest.fn();
    const listRef = { current: { scrollToOffset } };
    const { result, unmount } = await renderHook(() =>
      useEpisodeCommentScrollPosition(13, listRef),
    );

    await act(async () => result.current.restore(2400));
    expect(scrollToOffset).toHaveBeenCalledWith({ animated: false, offset: 640 });

    await act(async () => result.current.track(920));
    await act(async () => unmount());

    expect(mockData.get('kaku:episode-comment-scroll:v1:13')).toBe('920');
    expect(mockData.has('kaku:episode-comment-scroll:v1:14')).toBe(false);
  });

  it('clamps a stale position to the current list and clears a top position', async () => {
    mockData.set('kaku:episode-comment-scroll:v1:13', '640');
    const scrollToOffset = jest.fn();
    const listRef = { current: { scrollToOffset } };
    const { result } = await renderHook(() =>
      useEpisodeCommentScrollPosition(13, listRef),
    );

    await act(async () => result.current.restore(300));
    expect(scrollToOffset).toHaveBeenCalledWith({ animated: false, offset: 300 });

    await act(async () => {
      result.current.track(0);
      result.current.save();
    });
    expect(mockData.has('kaku:episode-comment-scroll:v1:13')).toBe(false);
  });

  it('explicitly resets a reused list when the episode has no saved position', async () => {
    const scrollToOffset = jest.fn();
    const listRef = { current: { scrollToOffset } };
    const { result } = await renderHook(() =>
      useEpisodeCommentScrollPosition(14, listRef),
    );

    await act(async () => result.current.restore(2400));

    expect(scrollToOffset).toHaveBeenCalledWith({ animated: false, offset: 0 });
  });
});
