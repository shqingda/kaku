import { act, renderHook } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { createLoginProof, loginAttemptStorage } from '@/features/auth/login-proof';
import * as WebBrowser from 'expo-web-browser';
import { unregisterPushDevice } from '@/features/push/device-registration';
import { authStorage } from '@/features/auth/auth-storage';
import {
  exchangeHandoffCode,
  fetchKaku,
  refreshAuthSession,
  KakuApiError,
} from '@/infrastructure/kaku/auth-client';

jest.mock('@/features/auth/login-device', () => ({ getLoginDevice: async () => ({ deviceName: 'iPhone', deviceKey: 'a'.repeat(64) }) }));

const mockQueryClient = { removeQueries: jest.fn() };
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
}));
jest.mock('@/features/auth/login-proof', () => ({
  createLoginProof: jest.fn(),
  loginAttemptStorage: { load: jest.fn(), save: jest.fn().mockResolvedValue(undefined), clear: jest.fn().mockResolvedValue(undefined) },
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

const requestId = '498e27b7-5192-48ce-9b13-f4a27f10f806';
const pendingLogin = { codeVerifier: 'A'.repeat(43), requestId, createdAt: Date.now() };
const callback = `kaku://auth/callback?code=12345678901234567890&request_id=${requestId}`;
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
  jest.mocked(loginAttemptStorage.load).mockResolvedValue(pendingLogin);
  jest.mocked(createLoginProof).mockResolvedValue({ codeChallenge: 'B'.repeat(43), pending: pendingLogin });
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
  expect(fetchKaku).toHaveBeenLastCalledWith('/second', 'new-access', expect.objectContaining({ signal: expect.any(AbortSignal) }));
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
    await hook.result.current.completeSignIn(callback);
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


test('a handoff without a local login request cannot replace the current account', async () => {
  jest.mocked(loginAttemptStorage.load).mockResolvedValue(null);
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  await act(async () => { await expect(hook.result.current.completeSignIn(callback)).rejects.toThrow('登录'); });
  expect(exchangeHandoffCode).not.toHaveBeenCalled();
  expect(hook.result.current.session).toEqual(original);
});

test('a callback for another request preserves the legitimate pending proof', async () => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  await act(async () => { await expect(hook.result.current.completeSignIn(callback.replace(requestId, '498e27b7-5192-48ce-9b13-f4a27f10f807'))).rejects.toThrow('登录'); });
  expect(exchangeHandoffCode).not.toHaveBeenCalled();
  expect(loginAttemptStorage.clear).not.toHaveBeenCalled();
});

test('the auth browser and deep link share one verified session exchange', async () => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  jest.mocked(exchangeHandoffCode).mockResolvedValue(refreshed);
  await act(async () => { await Promise.all([hook.result.current.completeSignIn(callback), hook.result.current.completeSignIn(callback)]); });
  await act(async () => { await hook.result.current.completeSignIn(callback); });
  expect(exchangeHandoffCode).toHaveBeenCalledTimes(1);
  expect(exchangeHandoffCode).toHaveBeenCalledWith({ code: '12345678901234567890', deviceName: 'iPhone', deviceKey: 'a'.repeat(64), codeVerifier: pendingLogin.codeVerifier, requestId });
  expect(loginAttemptStorage.clear).toHaveBeenCalledTimes(1);
});

test('sign in persists client proof before opening the browser and sends only its challenge', async () => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  jest.mocked(exchangeHandoffCode).mockResolvedValue(refreshed);
  jest.mocked(WebBrowser.openAuthSessionAsync).mockImplementation(async (url) => {
    expect(loginAttemptStorage.save).toHaveBeenCalledWith(pendingLogin);
    const loginUrl = new URL(url);
    expect(loginUrl.searchParams.get('code_challenge')).toBe('B'.repeat(43));
    expect(loginUrl.searchParams.get('request_id')).toBe(requestId);
    expect(url).not.toContain(pendingLogin.codeVerifier);
    return { type: 'success', url: callback };
  });
  await act(async () => { expect(await hook.result.current.signIn()).toBe(true); });
});

test('captured requests cannot borrow a replacement account', async () => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  const scope = hook.result.current.captureRequest();
  const other = { ...original, sessionId: 'other', user: { id: 2, username: 'b', nickname: 'B' } };
  jest.mocked(exchangeHandoffCode).mockResolvedValue(other);
  await act(async () => { await hook.result.current.completeSignIn(callback); });
  expect(scope.isCurrent()).toBe(false);
  await expect(scope.request('/write', { method: 'POST' })).rejects.toMatchObject({ name: 'AuthSessionChangedError' });
  expect(fetchKaku).not.toHaveBeenCalled();
});

test('an old successful response cannot reach feature callbacks after a new login', async () => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  const response = deferred<Response>();
  jest.mocked(fetchKaku).mockReturnValue(response.promise);
  let oldRequest!: Promise<unknown>;
  await act(async () => { oldRequest = hook.result.current.request('/write', { method: 'POST' }).catch(error => error); });
  jest.mocked(exchangeHandoffCode).mockResolvedValue({ ...original, sessionId: 'replacement' });
  await act(async () => { await hook.result.current.completeSignIn(callback); response.resolve(new Response(null, { status: 200 })); });
  expect(await oldRequest).toMatchObject({ name: 'AuthSessionChangedError' });
});


test('captured identity survives token rotation but not a same-account replacement session', async () => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  const scope = hook.result.current.captureRequest();
  jest.mocked(fetchKaku).mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValue(new Response(null, { status: 200 }));
  jest.mocked(refreshAuthSession).mockResolvedValue(refreshed);
  await act(async () => { await scope.request('/rotate'); });
  expect(scope.isCurrent()).toBe(true);
  jest.mocked(exchangeHandoffCode).mockResolvedValue({ ...original, sessionId: 'replacement' });
  await act(async () => { await hook.result.current.completeSignIn(callback); });
  expect(scope.isCurrent()).toBe(false);
  await expect(scope.request('/write')).rejects.toMatchObject({ name: 'AuthSessionChangedError' });
});


test.each(['signOut', 'disconnectBangumi'] as const)('an old %s cannot revoke or clear a replacement login', async (action) => {
  const hook = await renderHook(useAuth, { wrapper: AuthProvider });
  const pending = deferred<void>();
  jest.mocked(unregisterPushDevice).mockReturnValueOnce(pending.promise);
  let exiting!: Promise<unknown>;
  await act(async () => { exiting = hook.result.current[action]().catch(error => error); });
  const other = { ...original, sessionId: 'other', user: { id: 2, username: 'b', nickname: 'B' } };
  jest.mocked(exchangeHandoffCode).mockResolvedValue(other);
  await act(async () => { await hook.result.current.completeSignIn(callback); });
  await act(async () => { pending.resolve(); await exiting; });
  expect(hook.result.current.session).toEqual(other);
  expect(hook.result.current.error).toBeUndefined();
  expect(fetchKaku).not.toHaveBeenCalled();
  expect(authStorage.clear).not.toHaveBeenCalled();
});
