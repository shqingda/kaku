import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { type AuthRequestScope } from '@/features/auth/auth-request-scope';
import { useAuthMutation } from '@/features/auth/use-auth-mutation';

let mockEpoch = 0;
const mockRequest = jest.fn();
jest.mock('@/features/auth/auth-provider', () => ({ useAuthActions: () => ({ captureRequest: () => {
  const epoch = mockEpoch;
  return { identity: { userId: 1, sessionId: `session-${epoch}`, authEpoch: epoch }, isCurrent: () => mockEpoch === epoch, request: async (...args: unknown[]) => {
    if (epoch !== mockEpoch) throw new (require('@/features/auth/auth-request-scope').AuthSessionChangedError)();
    return mockRequest(...args);
  } } satisfies AuthRequestScope;
} }) }));
let client: QueryClient;
function Wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}>{children}</QueryClientProvider>; }
beforeEach(() => { mockEpoch = 0; mockRequest.mockReset(); onlineManager.setOnline(true); client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: Infinity } } }); });
afterEach(async () => { await cleanup(); client.clear(); onlineManager.setOnline(true); });

test('queued writes retain their original identity and skip all callbacks after it changes', async () => {
  let finish!: (response: Response) => void;
  mockRequest.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  const success = jest.fn(); const failure = jest.fn(); const settled = jest.fn(); const callSuccess = jest.fn();
  const hook = await renderHook(() => useAuthMutation({
    scope: { id: 'serial' }, mutationFn: (value: string, request) => request(`/write/${value}`, { method: 'POST' }),
    onSuccess: success, onError: failure, onSettled: settled,
  }), { wrapper: Wrapper });
  let first!: Promise<unknown>; let second!: Promise<unknown>;
  await act(async () => {
    first = hook.result.current.mutateAsync('first', { onSuccess: callSuccess }).catch(error => error);
    second = hook.result.current.mutateAsync('second', { onSuccess: callSuccess }).catch(error => error);
  });
  await waitFor(() => expect(mockRequest).toHaveBeenCalledTimes(1));
  mockEpoch += 1;
  await act(async () => { finish(new Response(null, { status: 200 })); await Promise.all([first, second]); await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(mockRequest).toHaveBeenCalledTimes(1);
  expect(await first).toMatchObject({ name: 'AuthSessionChangedError' });
  expect(await second).toMatchObject({ name: 'AuthSessionChangedError' });
  expect(success).not.toHaveBeenCalled(); expect(failure).not.toHaveBeenCalled(); expect(settled).not.toHaveBeenCalled(); expect(callSuccess).not.toHaveBeenCalled();
});

test('an offline mutation cannot resume using a newer login', async () => {
  onlineManager.setOnline(false);
  const hook = await renderHook(() => useAuthMutation({ mutationFn: (_: void, request) => request('/write') }), { wrapper: Wrapper });
  let pending!: Promise<unknown>;
  await act(async () => { pending = hook.result.current.mutateAsync().catch(error => error); });
  await waitFor(() => expect(hook.result.current.isPaused).toBe(true));
  mockEpoch += 1;
  await act(async () => { onlineManager.setOnline(true); await pending; await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(mockRequest).not.toHaveBeenCalled();
  expect(await pending).toMatchObject({ name: 'AuthSessionChangedError' });
});

test('directory refresh does not continue into another identity after awaiting its first invalidation', async () => {
  const { useUpdateIndex } = require('@/features/indexes/use-create-index');
  let finish!: () => void;
  const pending = new Promise<void>(resolve => { finish = resolve; });
  const invalidate = jest.spyOn(client, 'invalidateQueries').mockReturnValueOnce(pending).mockResolvedValue(undefined);
  mockRequest.mockResolvedValue(new Response(null, { status: 204 }));
  const hook = await renderHook(() => useUpdateIndex(42), { wrapper: Wrapper });
  let saving!: Promise<unknown>;
  await act(async () => { saving = hook.result.current.mutateAsync({ title: 'new', desc: '', isPrivate: true, expected: { title: 'old', desc: '', isPrivate: true } }).catch((error: Error) => error); });
  await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(1));
  mockEpoch += 1;
  await act(async () => { finish(); await saving; await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(invalidate).toHaveBeenCalledTimes(1);
  expect(await saving).toMatchObject({ name: 'AuthSessionChangedError' });
});
