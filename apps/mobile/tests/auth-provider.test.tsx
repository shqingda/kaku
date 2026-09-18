import { act, renderHook } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { authStorage } from '@/features/auth/auth-storage';
import {
  exchangeHandoffCode,
  fetchKaku,
  refreshAuthSession,
  KakuApiError,
} from '@/infrastructure/kaku/auth-client';

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ removeQueries: jest.fn() }),
}));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('@/features/auth/auth-storage', () => ({
  authStorage: {
    load: jest.fn(),
    save: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
  },
}));
jest.mock('@/features/push/device-registration', () => ({ unregisterPushDevice: jest.fn() }));
jest.mock('@/infrastructure/kaku/auth-client', () => ({
  ...jest.requireActual('@/infrastructure/kaku/auth-client'),
  exchangeHandoffCode: jest.fn(),
  fetchKaku: jest.fn(),
  refreshAuthSession: jest.fn(),
}));

const original = {
  expiresAt: Date.now() + 3_600_000,
  refreshExpiresAt: Date.now() + 86_400_000,
  refreshToken: 'old-refresh',
  sessionToken: 'old-access',
  sessionId: 'session',
  user: { id: 1, username: 'a', nickname: 'A' },
};
const refreshed = { ...original, refreshToken: 'new-refresh', sessionToken: 'new-access' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchKaku).mockReset();
  jest.mocked(refreshAuthSession).mockReset();
  jest.mocked(authStorage.load).mockResolvedValue(original);
});

test.each(['collection_removal_unsupported', 'another_conflict'])(
  'business conflict %s preserves the session and response body', async (error) => {
    const hook = await renderHook(useAuth, { wrapper: AuthProvider });
    jest.mocked(fetchKaku).mockResolvedValue(Response.json({ error }, { status: 409 }));
    await act(async () => {
      const response = await hook.result.current.request('/me/collections/1');
      expect(await response.json()).toEqual({ error });
    });
    expect(hook.result.current.session).toEqual(original);
    expect(authStorage.clear).not.toHaveBeenCalled();
  },
);

test('an explicit upstream authorization failure clears the session', async () => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  jest.mocked(fetchKaku).mockResolvedValue(Response.json(
    { error: 'bangumi_reauthorization_required' }, { status: 409 },
  ));
  await act(async () => { await hook.result.current.request('/me/collections/1'); });
  expect(hook.result.current.session).toBeNull();
});

test('a late 401 reuses credentials rotated by an earlier request', async () => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  const pending = deferred<Response>();
  jest.mocked(fetchKaku).mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockReturnValueOnce(pending.promise)
    .mockResolvedValue(new Response(null, { status: 200 }));
  jest.mocked(refreshAuthSession).mockResolvedValueOnce(refreshed);
  let late!: Promise<Response>;
  await act(async () => {
    const first = hook.result.current.request('/first');
    late = hook.result.current.request('/second');
    await first;
  });
  await act(async () => { pending.resolve(new Response(null, { status: 401 })); await late; });
  expect(refreshAuthSession).toHaveBeenCalledTimes(1);
  expect(fetchKaku).toHaveBeenLastCalledWith('/second', 'new-access', undefined);
  expect(hook.result.current.session).toEqual(refreshed);
});

test.each(['success', 'failure'])('old refresh %s cannot replace or clear a new login', async (outcome) => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  const pending = deferred<typeof original>();
  jest.mocked(fetchKaku).mockResolvedValue(new Response(null, { status: 401 }));
  jest.mocked(refreshAuthSession).mockReturnValue(pending.promise);
  let oldRequest!: Promise<unknown>;
  await act(async () => {
    oldRequest = hook.result.current.request('/first').catch(error => error);
  });
  const other = { ...original, sessionId: 'other', user: { id: 2, username: 'b', nickname: 'B' } };
  jest.mocked(exchangeHandoffCode).mockResolvedValue(other);
  await act(async () => {
    await hook.result.current.completeSignIn('kaku://auth/callback?code=12345678901234567890');
  });
  await act(async () => {
    if (outcome === 'success') pending.resolve(refreshed);
    else pending.reject(new KakuApiError('consumed', 401));
    await oldRequest;
  });
  expect(hook.result.current.session).toEqual(other);
  expect(authStorage.save).toHaveBeenLastCalledWith(other);
  expect(authStorage.clear).not.toHaveBeenCalled();
});
