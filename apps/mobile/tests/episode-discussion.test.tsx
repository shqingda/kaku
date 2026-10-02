import { act, renderHook } from '@testing-library/react-native';
import { useEpisodeDiscussion } from '@/features/discussions/use-episode-discussion';

jest.mock('@/features/preferences/spoiler-preference', () => ({
  useSpoilerPreference: () => ({ enabled: true }),
}));
jest.mock('@/features/catalog/use-catalog-subject', () => ({
  useCatalogSubject: () => ({ data: { type: 2, totalEpisodes: 2, episodes: [
    { id: 13, number: 1 }, { id: 14, number: 2 },
  ] } }),
}));
jest.mock('@/features/collections/use-personal-collection', () => ({
  usePersonalCollection: () => ({ isSuccess: false, isError: true }),
  useSavePersonalCollection: () => ({}),
}));
const mockComments = jest.fn((..._args: unknown[]) => ({ data: [{ id: '1' }] }));
jest.mock('@/features/discussions/use-bangumi-discussions', () => ({
  useBangumiEpisodeComments: (...args: unknown[]) => mockComments(...args),
}));

it('keeps failed progress reads hidden and resets a temporary reveal on chapter, account and mount changes', async () => {
  const { result, rerender, unmount } = await renderHook<ReturnType<typeof useEpisodeDiscussion>, { episode: number; user: number }>(({ episode, user }) =>
    useEpisodeDiscussion(1, episode, user), { initialProps: { episode: 1, user: 1 } });
  expect(result.current.hiddenDiscussion).toBe(true);
  expect(result.current.replies).toEqual([]);
  expect(mockComments).toHaveBeenLastCalledWith(13, false);
  await act(async () => result.current.revealDiscussion());
  expect(result.current.replies).toEqual([{ id: '1' }]);
  await rerender({ episode: 2, user: 1 });
  expect(result.current.hiddenDiscussion).toBe(true);
  expect(result.current.previousEpisode?.number).toBe(1);
  await act(async () => result.current.revealDiscussion());
  await rerender({ episode: 2, user: 2 });
  expect(result.current.hiddenDiscussion).toBe(true);
  await act(async () => result.current.revealDiscussion());
  await unmount();
  const mounted = await renderHook(() => useEpisodeDiscussion(1, 2, 2));
  expect(mounted.result.current.hiddenDiscussion).toBe(true);
});
