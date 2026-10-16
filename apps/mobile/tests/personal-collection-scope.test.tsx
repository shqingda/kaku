import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthSessionChangedError } from '@/features/auth/auth-provider';
import { useSavePersonalCollection } from '@/features/collections/use-personal-collection';
import { savePersonalCollection } from '@/infrastructure/kaku/collections-client';
import { queryKeys } from '@/lib/query-keys';

let mockUser = 1;
let mockEpoch = 1;
const mockRequest = jest.fn();
jest.mock('@/features/auth/auth-provider', () => ({
  AuthSessionChangedError: class extends Error {},
  useAuth: () => ({ session: { user: { id: mockUser, username: `user${mockUser}` } }, request: mockRequest }),
  useAuthActions: () => ({ captureRequest: () => {
    const userId = mockUser;
    const epoch = mockEpoch;
    return { identity: { userId, sessionId: `session${epoch}`, authEpoch: epoch }, request: mockRequest, isCurrent: () => userId === mockUser && epoch === mockEpoch };
  } }),
}));
jest.mock('@/infrastructure/kaku/collections-client', () => ({ savePersonalCollection: jest.fn(), getPersonalCollection: jest.fn() }));
const collection = { collectionStatus: 'doing' as const, comment: 'old', isPrivate: false, subjectId: 42, tags: [], watchedEpisodeNumbers: [1], watchedEpisodeIds: [101] };
let client: QueryClient;
function wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }
beforeEach(() => { jest.resetAllMocks(); mockUser = 1; mockEpoch = 1; client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity } } }); });
afterEach(async () => { await cleanup(); client.clear(); });

test('queued old-account writes cannot migrate to a new account or refill either cache', async () => {
  let finish!: (value: typeof collection) => void;
  jest.mocked(savePersonalCollection).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(collection);
  const oldKey = queryKeys.personalCollection(1, 42);
  const newKey = queryKeys.personalCollection(2, 42);
  client.setQueryData(oldKey, collection);
  const hook = await renderHook(() => useSavePersonalCollection(42), { wrapper });
  let first!: Promise<unknown>;
  let second!: Promise<unknown>;
  await act(async () => {
    first = hook.result.current.mutateAsync({ comment: 'first' }).catch(error => error);
    second = hook.result.current.mutateAsync({ comment: 'queued' }).catch(error => error);
  });
  await waitFor(() => expect(finish).toBeDefined());
  mockUser = 2; mockEpoch++;
  const newCollection = { ...collection, comment: 'account B' };
  client.setQueryData(newKey, newCollection);
  client.removeQueries({ queryKey: oldKey });
  await hook.rerender(undefined);
  await act(async () => { finish({ ...collection, comment: 'late A' }); await first; await second; });
  await waitFor(() => expect(hook.result.current.isPending).toBe(false));
  expect(savePersonalCollection).toHaveBeenCalledTimes(1);
  expect(await first).toBeInstanceOf(AuthSessionChangedError);
  expect(await second).toBeInstanceOf(AuthSessionChangedError);
  expect(client.getQueryData(oldKey)).toBeUndefined();
  expect(client.getQueryData(newKey)).toEqual(newCollection);
});

test('same-account new session invalidates a queued mutation as well', async () => {
  let finish!: (value: typeof collection) => void;
  jest.mocked(savePersonalCollection).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValue(collection);
  const hook = await renderHook(() => useSavePersonalCollection(42), { wrapper });
  let first!: Promise<unknown>; let second!: Promise<unknown>;
  await act(async () => { first = hook.result.current.mutateAsync({ comment: 'first' }).catch(error => error); second = hook.result.current.mutateAsync({ comment: 'queued' }).catch(error => error); });
  await waitFor(() => expect(finish).toBeDefined());
  mockEpoch++;
  await hook.rerender(undefined);
  client.removeQueries();
  await act(async () => { finish(collection); await first; await second; });
  await waitFor(() => expect(hook.result.current.isPending).toBe(false));
  expect(savePersonalCollection).toHaveBeenCalledTimes(1);
  expect(await first).toBeInstanceOf(AuthSessionChangedError);
  expect(await second).toBeInstanceOf(AuthSessionChangedError);
  expect(client.getQueryData(queryKeys.personalCollection(1, 42))).toBeUndefined();
});

test.each([1, 2])('a late collection response body rejects after user %i replaces the session', async (nextUser) => {
  let finishBody!: (body: unknown) => void;
  const body = new Promise(resolve => { finishBody = resolve; });
  const json = jest.fn(() => body);
  mockRequest.mockResolvedValue({ ok: true, status: 200, json } as unknown as Response);
  const actualClient = jest.requireActual<typeof import('@/infrastructure/kaku/collections-client')>('@/infrastructure/kaku/collections-client');
  jest.mocked(savePersonalCollection).mockImplementationOnce(actualClient.savePersonalCollection);
  const hook = await renderHook(() => useSavePersonalCollection(42), { wrapper });
  let pending!: Promise<unknown>;
  const success = jest.fn();
  await act(async () => {
    pending = hook.result.current.mutateAsync({ comment: 'old response' }).then(success).catch(error => error);
  });
  await waitFor(() => expect(json).toHaveBeenCalledTimes(1));
  mockUser = nextUser;
  mockEpoch++;
  await hook.rerender(undefined);
  const newCollection = { ...collection, comment: 'replacement session' };
  const newKey = queryKeys.personalCollection(nextUser, 42);
  client.setQueryData(newKey, newCollection);
  await act(async () => { finishBody({ collection }); await pending; });
  await waitFor(() => expect(hook.result.current.isPending).toBe(false));
  expect(await pending).toBeInstanceOf(AuthSessionChangedError);
  expect(success).not.toHaveBeenCalled();
  expect(client.getQueryData(newKey)).toEqual(newCollection);
});

test('a session change while mutation callbacks settle cannot resolve a successful save', async () => {
  client = new QueryClient({
    mutationCache: new MutationCache({ onSettled: () => { mockEpoch++; } }),
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  });
  jest.mocked(savePersonalCollection).mockResolvedValue(collection);
  const hook = await renderHook(() => useSavePersonalCollection(42), { wrapper });
  let result: unknown;
  await act(async () => { result = await hook.result.current.mutateAsync({ comment: 'saved' }).catch(error => error); });
  await waitFor(() => expect(hook.result.current.isPending).toBe(false));
  expect(result).toBeInstanceOf(AuthSessionChangedError);
});
