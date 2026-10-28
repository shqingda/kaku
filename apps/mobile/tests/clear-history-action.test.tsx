import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useClearHistoryAction } from '@/features/history/use-clear-history-action';
let mockUser: number | undefined = 1;
let mockSync = true;
let mockAvailable = true;
let mockLocalSaved = true;
const mockCanSyncNow = () => mockSync && mockAvailable && mockLocalSaved;
const mockIsCurrentSyncScope = () => true;
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: mockUser === undefined ? null : { user: { id: mockUser } } }) }));
jest.mock('@/features/preferences/preferences-provider', () => ({ usePreferences: () => ({ preferences: { syncEnabled: mockSync }, cloudSyncAvailable: mockAvailable, canSync: mockCanSyncNow(), canSyncNow: mockCanSyncNow, isCurrentSyncScope: mockIsCurrentSyncScope }) }));
const clear = jest.fn();
const target = { clearHistory: clear, localStatus: 'ready' as const, isClearing: false };
let alerts: jest.SpyInstance;
beforeEach(() => { mockUser = 1; mockSync = true; mockAvailable = true; mockLocalSaved = true; clear.mockReset().mockResolvedValue(undefined); alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => alerts.mockRestore());

test.each(['guest', 'sync-on', 'sync-off'] as const)('%s clears immediately without confirmation or result alerts, including failure', async mode => {
  mockUser = mode === 'guest' ? undefined : 1;
  mockSync = mode === 'sync-on';
  clear.mockRejectedValueOnce(new Error('disk'));
  const hook = await renderHook(useClearHistoryAction);
  await act(async () => { await hook.result.current(target); });
  expect(clear).toHaveBeenCalledTimes(1);
  expect(alerts).not.toHaveBeenCalled();
  await act(async () => { await hook.result.current(target); });
  expect(clear).toHaveBeenCalledTimes(2);
  expect(alerts).not.toHaveBeenCalled();
});

test.each(['account', 'sync', 'availability', 'local-save', 'roundtrip'] as const)('%s changes invalidate stale actions', async change => {
  const hook = await renderHook(useClearHistoryAction);
  const old = hook.result.current;
  if (change === 'account' || change === 'roundtrip') mockUser = 2;
  if (change === 'sync') mockSync = false;
  if (change === 'availability') mockAvailable = false;
  if (change === 'local-save') mockLocalSaved = false;
  await hook.rerender(undefined);
  if (change === 'roundtrip') { mockUser = 1; await hook.rerender(undefined); }
  await act(async () => { await old(target); });
  expect(clear).not.toHaveBeenCalled();
  expect(alerts).not.toHaveBeenCalled();
});

test('a pending clear ignores duplicate presses', async () => {
  let resolve!: () => void;
  clear.mockReturnValueOnce(new Promise<void>(done => { resolve = done; }));
  const hook = await renderHook(useClearHistoryAction);
  let pending!: Promise<void>;
  await act(async () => { pending = hook.result.current(target); await hook.result.current(target); });
  expect(clear).toHaveBeenCalledTimes(1);
  await hook.unmount();
  await act(async () => { resolve(); await pending; });
  expect(alerts).not.toHaveBeenCalled();
});

test.each(['loading', 'read-error'] as const)('%s history cannot be cleared', async localStatus => {
  const hook = await renderHook(useClearHistoryAction);
  await act(async () => { await hook.result.current({ ...target, localStatus }); });
  expect(clear).not.toHaveBeenCalled();
  expect(alerts).not.toHaveBeenCalled();
});
