import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QuickProgressButton } from '@/features/home/quick-progress-button';
import { getPersonalCollection, savePersonalCollection } from '@/infrastructure/kaku/collections-client';
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: { user: { id: 1, username: 'one' } }, request: jest.fn() }) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));
jest.mock('@/features/catalog/use-catalog-subject', () => ({ useCatalogSubject: () => ({ data: { type: 2, totalEpisodes: 3, episodes: [1, 2, 3].map(number => ({ id: number, number })) } }) }));
jest.mock('@/features/collections/use-personal-collection', () => ({ usePersonalCollection: () => ({ data: { collectionStatus: 'doing', watchedEpisodeNumbers: [1] }, isPending: false }) }));
jest.mock('@/infrastructure/kaku/collections-client', () => ({ getPersonalCollection: jest.fn(), savePersonalCollection: jest.fn() }));
const current = { collectionStatus: 'doing' as const, watchedEpisodeNumbers: [1], subjectId: 2, comment: '', tags: [], isPrivate: false };
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(getPersonalCollection).mockResolvedValue(current);
  jest.mocked(savePersonalCollection).mockResolvedValue({ ...current, watchedEpisodeNumbers: [1, 2] });
});
async function open() {
  await render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } })}>
    <QuickProgressButton subjectId={2} />
  </QueryClientProvider>);
  await waitFor(() => expect(screen.getByText('看过第 2 集')).toBeTruthy());
}
test('double taps make one write and expose a working undo', async () => {
  await open();
  let finishRead!: (value: typeof current) => void;
  jest.mocked(getPersonalCollection).mockImplementationOnce(() => new Promise(resolve => { finishRead = resolve; }));
  const button = screen.getByText('看过第 2 集');
  await fireEvent.press(button);
  await fireEvent.press(button);
  await waitFor(() => expect(finishRead).toBeDefined());
  await act(() => { finishRead(current); });
  await waitFor(() => expect(screen.getByText('撤销')).toBeTruthy());
  expect(savePersonalCollection).toHaveBeenCalledTimes(1);
  jest.mocked(getPersonalCollection).mockResolvedValue({ ...current, watchedEpisodeNumbers: [1, 2, 3] });
  await fireEvent.press(screen.getByText('撤销'));
  await waitFor(() => expect(savePersonalCollection).toHaveBeenLastCalledWith(expect.anything(), 2, { watchedEpisodeNumbers: [1, 3] }));
});
test('failed writes show retry and do not report success', async () => {
  jest.mocked(savePersonalCollection).mockRejectedValueOnce(new Error('网络不可用'));
  await open();
  await fireEvent.press(screen.getByText('看过第 2 集'));
  await waitFor(() => expect(screen.getByText('再试一次')).toBeTruthy());
  expect(screen.queryByText('已记下第 2 集')).toBeNull();
  await fireEvent.press(screen.getByText('再试一次'));
  await waitFor(() => expect(screen.getByText('已记下第 2 集')).toBeTruthy());
});
test('a newer server progress blocks a stale next-episode action', async () => {
  jest.mocked(getPersonalCollection).mockResolvedValue({ ...current, watchedEpisodeNumbers: [1, 2] });
  await open();
  await fireEvent.press(screen.getByText('看过第 2 集'));
  await waitFor(() => expect(screen.getByText('进度刚有更新，去勾选已看集数')).toBeTruthy());
  expect(savePersonalCollection).not.toHaveBeenCalled();
});
