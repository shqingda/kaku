import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';
import { onlineManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/features/auth/auth-provider';
import { useSetUserFriend } from '@/features/users/use-friendship';
import { PreferencesProvider, usePreferences } from '@/features/preferences/preferences-provider';
import { authStorage } from '@/features/auth/auth-storage';
import { exchangeHandoffCode, fetchKaku, refreshAuthSession } from '@/infrastructure/kaku/auth-client';
import { setUserFriend } from '@/infrastructure/kaku/friends-client';
import { PRIVATE_QUERY_META, PUBLIC_QUERY_META } from '@/lib/query-persistence';
import { queryKeys } from '@/lib/query-keys';

jest.unmock('@/features/preferences/preferences-provider');
jest.mock('@/features/auth/login-proof', () => ({
  createLoginProof: jest.fn(),
  loginAttemptStorage: { load: async () => ({ codeVerifier: 'A'.repeat(43), requestId: '498e27b7-5192-48ce-9b13-f4a27f10f806', createdAt: Date.now() }), save: jest.fn(), clear: jest.fn() },
}));
jest.mock('expo-web-browser', () => ({ openAuthSessionAsync: jest.fn() }));
jest.mock('@/features/auth/auth-storage', () => ({ authStorage: { load: jest.fn(), save: jest.fn().mockResolvedValue(undefined), clear: jest.fn().mockResolvedValue(undefined) } }));
jest.mock('@/features/push/device-registration', () => ({ unregisterPushDevice: jest.fn() }));
jest.mock('@/infrastructure/kaku/auth-client', () => ({ ...jest.requireActual('@/infrastructure/kaku/auth-client'), exchangeHandoffCode: jest.fn(), fetchKaku: jest.fn(), refreshAuthSession: jest.fn() }));
jest.mock('@/infrastructure/kaku/friends-client', () => ({ getUserFriendship: jest.fn(), setUserFriend: jest.fn() }));
jest.mock('@/features/config/use-public-config', () => ({ usePublicConfig: () => ({ data: undefined }) }));
jest.mock('@/features/preferences/app-preferences', () => ({ loadAppPreferences: async () => ({ theme: 'system', updatedAt: null, syncEnabled: true }), saveAppPreferences: jest.fn().mockResolvedValue(undefined) }));

const original = { expiresAt: Date.now() + 3_600_000, refreshExpiresAt: Date.now() + 86_400_000, refreshToken: 'old-refresh', sessionToken: 'old-access', sessionId: 'session-a', user: { id: 1, username: 'a', nickname: 'A' } };
const callback = 'kaku://auth/callback?code=12345678901234567890&request_id=498e27b7-5192-48ce-9b13-f4a27f10f806';
let client: QueryClient;
function Wrapper({ children }: { children: ReactNode }) { return <QueryClientProvider client={client}><AuthProvider>{children}</AuthProvider></QueryClientProvider>; }
function PreferencesWrapper({ children }: { children: ReactNode }) { return <Wrapper><PreferencesProvider>{children}</PreferencesProvider></Wrapper>; }
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(yes => { resolve = yes; }); return { promise, resolve }; }
function seed<T>(queryKey: readonly unknown[], value: T, meta = PRIVATE_QUERY_META as Record<string, unknown>) {
  client.setQueryDefaults(queryKey, { meta });
  client.setQueryData(queryKey, value);
}
beforeEach(() => { jest.clearAllMocks(); onlineManager.setOnline(true); client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity, retry: false }, mutations: { gcTime: Infinity, retry: false } } }); jest.mocked(authStorage.load).mockResolvedValue(original); });
afterEach(async () => { await cleanup(); client.clear(); onlineManager.setOnline(true); });

test.each([1, 2])('a replacement login for user %s removes cancelled optimistic data before it is published', async (userId) => {
  const oldKey = queryKeys.userFriendship(1, 'target');
  const publicKey = queryKeys.catalogSubject(42, 1);
  client.setQueryData(oldKey, false); seed(publicKey, { title: 'public' }, PUBLIC_QUERY_META);
  const hook = await renderHook(() => ({ auth: useAuth(), friend: useSetUserFriend('target') }), { wrapper: Wrapper });
  onlineManager.setOnline(false);
  let pending!: Promise<unknown>;
  await act(async () => { pending = hook.result.current.friend.mutateAsync(true).catch(error => error); });
  await waitFor(() => expect(hook.result.current.friend.isPaused).toBe(true));
  expect(client.getQueryData(oldKey)).toBe(true);
  jest.mocked(exchangeHandoffCode).mockResolvedValue({ ...original, sessionId: 'replacement', user: { id: userId, username: `user${userId}`, nickname: 'replacement' } });
  await act(async () => { await hook.result.current.auth.completeSignIn(callback); });
  expect(client.getQueryData(oldKey)).toBeUndefined();
  expect(client.getQueryData(publicKey)).toEqual({ title: 'public' });
  const currentKey = queryKeys.userFriendship(userId, 'target');
  seed(currentKey, false);
  await act(async () => { onlineManager.setOnline(true); await pending; await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(await pending).toMatchObject({ name: 'AuthSessionChangedError' });
  expect(setUserFriend).not.toHaveBeenCalled();
  expect(client.getQueryData(currentKey)).toBe(false);
});

test('token rotation preserves the active identity and its private cache', async () => {
  const key = queryKeys.userFriendship(1, 'target'); seed(key, false);
  const hook = await renderHook(useAuth, { wrapper: Wrapper });
  const scope = hook.result.current.captureRequest();
  jest.mocked(fetchKaku).mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status: 200 }));
  jest.mocked(refreshAuthSession).mockResolvedValue({ ...original, sessionToken: 'rotated-access', refreshToken: 'rotated-refresh' });
  await act(async () => { await scope.request('/rotate'); });
  expect(scope.isCurrent()).toBe(true);
  expect(client.getQueryData(key)).toBe(false);
});

test('failed replacement login retains existing cache, identity and working preference synchronization', async () => {
  const key = queryKeys.userFriendship(1, 'target'); seed(key, false);
  jest.mocked(fetchKaku).mockImplementation(async () => Response.json({ preferences: { theme: 'system', locale: 'system', updatedAt: null } }));
  const hook = await renderHook(() => ({ auth: useAuth(), preferences: usePreferences() }), { wrapper: PreferencesWrapper });
  await waitFor(() => expect(fetchKaku).toHaveBeenCalled());
  const scope = hook.result.current.auth.captureRequest();
  const count = jest.mocked(fetchKaku).mock.calls.length;
  jest.mocked(exchangeHandoffCode).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await expect(hook.result.current.auth.completeSignIn(callback)).rejects.toThrow('offline'); });
  expect(hook.result.current.auth.session).toEqual(original);
  expect(client.getQueryData(key)).toBe(false);
  expect(scope.isCurrent()).toBe(true);
  await act(async () => { hook.result.current.preferences.setTheme('dark'); await hook.result.current.preferences.retryCloudSync(); });
  expect(jest.mocked(fetchKaku).mock.calls.length).toBeGreaterThan(count);
});

test('a refresh started while replacement login is pending cannot overwrite the successful login', async () => {
  const hook = await renderHook(useAuth, { wrapper: Wrapper });
  const login = deferred<typeof original>(); const refresh = deferred<typeof original>();
  jest.mocked(exchangeHandoffCode).mockReturnValueOnce(login.promise);
  jest.mocked(fetchKaku).mockResolvedValueOnce(new Response(null, { status: 401 }));
  jest.mocked(refreshAuthSession).mockReturnValueOnce(refresh.promise);
  let signingIn!: Promise<void>; let oldRequest!: Promise<unknown>;
  await act(async () => { signingIn = hook.result.current.completeSignIn(callback); });
  await act(async () => { oldRequest = hook.result.current.request('/during-login').catch(error => error); });
  const replacement = { ...original, sessionId: 'replacement' };
  await act(async () => { login.resolve(replacement); await signingIn; });
  await act(async () => { refresh.resolve({ ...original, sessionToken: 'late-access' }); await oldRequest; });
  expect(hook.result.current.session).toEqual(replacement);
  expect(authStorage.save).toHaveBeenLastCalledWith(replacement);
  expect(await oldRequest).toMatchObject({ name: 'AuthSessionChangedError' });
});


test('a queued session save checks its operation owner again before writing storage', async () => {
  const hook = await renderHook(useAuth, { wrapper: Wrapper });
  const saving = deferred<void>();
  jest.mocked(authStorage.save).mockReturnValueOnce(saving.promise);
  const refreshed = { ...original, sessionToken: 'refresh-in-flight' };
  jest.mocked(refreshAuthSession).mockResolvedValueOnce(refreshed);
  jest.mocked(fetchKaku).mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValue(new Response(null, { status: 204 }));
  let oldRequest!: Promise<unknown>; let login!: Promise<unknown>; let exit!: Promise<void>;
  await act(async () => { oldRequest = hook.result.current.request('/rotate').catch(error => error); });
  await waitFor(() => expect(authStorage.save).toHaveBeenCalledWith(refreshed));
  const replacement = { ...original, sessionId: 'replacement' };
  jest.mocked(exchangeHandoffCode).mockResolvedValueOnce(replacement);
  await act(async () => { login = hook.result.current.completeSignIn(callback).catch(error => error); });
  await act(async () => { exit = hook.result.current.signOut(); });
  await act(async () => { saving.resolve(); await Promise.all([oldRequest, login, exit]); });
  expect(authStorage.save).not.toHaveBeenCalledWith(replacement);
  expect(authStorage.clear).toHaveBeenCalledTimes(1);
  expect(hook.result.current.session).toBeNull();
  expect(await login).toMatchObject({ name: 'AuthSessionChangedError' });
});

test('a failed handoff cannot discard valid credentials from a concurrent token rotation', async () => {
  const key = queryKeys.userFriendship(1, 'target'); seed(key, false);
  const hook = await renderHook(useAuth, { wrapper: Wrapper });
  const rotation = deferred<typeof original>();
  jest.mocked(fetchKaku).mockResolvedValueOnce(new Response(null, { status: 401 })).mockResolvedValueOnce(new Response(null, { status: 200 }));
  jest.mocked(refreshAuthSession).mockReturnValueOnce(rotation.promise);
  let request!: Promise<unknown>;
  await act(async () => { request = hook.result.current.request('/rotate').catch(error => error); });
  jest.mocked(exchangeHandoffCode).mockRejectedValueOnce(new Error('offline'));
  await act(async () => { await expect(hook.result.current.completeSignIn(callback)).rejects.toThrow('offline'); });
  const rotated = { ...original, sessionToken: 'rotated-access', refreshToken: 'rotated-refresh' };
  await act(async () => { rotation.resolve(rotated); await request; });
  expect(hook.result.current.session).toEqual(rotated);
  expect(authStorage.save).toHaveBeenLastCalledWith(rotated);
  expect(client.getQueryData(key)).toBe(false);
});
