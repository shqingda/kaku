import { act, renderHook } from '@testing-library/react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useEpisodeDiscussionScroll } from '@/features/discussions/use-episode-discussion-scroll';

let mockReducedMotion = false;
jest.mock('react-native-reanimated', () => ({ useReducedMotion: () => mockReducedMotion }));
jest.mock('expo-sqlite/kv-store', () => ({
  getItemSync: () => null,
  setItemSync: jest.fn(),
  removeItemSync: jest.fn(),
}));

const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
beforeEach(() => {
  mockReducedMotion = false;
  frames.clear();
  jest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((callback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  jest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => { if (id != null) frames.delete(id); });
});
afterEach(() => jest.restoreAllMocks());

function flushFrame() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach((callback) => callback(0));
}
function scrollEvent(y: number) {
  return { nativeEvent: {
    contentOffset: { y }, contentSize: { height: 10000 }, layoutMeasurement: { height: 500 },
  } } as NativeSyntheticEvent<NativeScrollEvent>;
}

it('lands near the latest reply, then uses the newly measured bottom', async () => {
  const scrollToOffset = jest.fn();
  const listRef = { current: { scrollToOffset } };
  const { result } = await renderHook(() => useEpisodeDiscussionScroll({
    canRestore: true, episodeId: 13, listRef, scope: '1:1',
  }));
  await act(async () => {
    result.current.listProps.onScroll(scrollEvent(0));
    result.current.jumpToLatest();
  });
  expect(scrollToOffset).toHaveBeenLastCalledWith({ animated: false, offset: 8500 });
  await act(async () => {
    flushFrame();
    result.current.listProps.onContentSizeChange(400, 11000);
    flushFrame();
  });
  expect(scrollToOffset).toHaveBeenLastCalledWith({ animated: true, offset: 10700 });
});

it.each(['drag', 'episode', 'unmount'] as const)('cancels queued landing on %s', async (reason) => {
  const scrollToOffset = jest.fn();
  const listRef = { current: { scrollToOffset } };
  const { result, rerender, unmount } = await renderHook<ReturnType<typeof useEpisodeDiscussionScroll>, { episode: number }>(({ episode }) => useEpisodeDiscussionScroll({
    canRestore: true, episodeId: episode, listRef, scope: `1:${episode}`,
  }), { initialProps: { episode: 13 } });
  await act(async () => {
    result.current.listProps.onScroll(scrollEvent(0));
    result.current.jumpToLatest();
    flushFrame();
  });
  scrollToOffset.mockClear();
  await act(async () => {
    if (reason === 'drag') result.current.listProps.onScrollBeginDrag(scrollEvent(8500));
    if (reason === 'episode') await rerender({ episode: 14 });
    if (reason === 'unmount') await unmount();
  });
  await act(async () => flushFrame());
  expect(scrollToOffset).not.toHaveBeenCalled();
});

it('respects reduced motion without queuing a landing', async () => {
  mockReducedMotion = true;
  const scrollToOffset = jest.fn();
  const listRef = { current: { scrollToOffset } };
  const { result } = await renderHook(() => useEpisodeDiscussionScroll({
    canRestore: true, episodeId: 13, listRef, scope: '1:1',
  }));
  await act(async () => {
    result.current.listProps.onScroll(scrollEvent(0));
    result.current.jumpToLatest();
  });
  expect(scrollToOffset).toHaveBeenLastCalledWith({ animated: false, offset: 9700 });
  expect(frames.size).toBe(0);
});
