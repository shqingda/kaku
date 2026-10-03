import { Alert } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { useClearHistoryAction } from '@/features/history/use-clear-history-action';
let mockUser: number | undefined = 1;
let mockSync = true;
let mockAvailable = true;
jest.mock('@/features/auth/auth-provider', () => ({ useAuth: () => ({ session: mockUser === undefined ? null : { user: { id: mockUser } } }) }));
jest.mock('@/features/preferences/preferences-provider', () => ({ usePreferences: () => ({ preferences: { syncEnabled: mockSync }, cloudSyncAvailable: mockAvailable }) }));
const clear = jest.fn();
const target = { clearHistory: clear, localStatus: 'ready' as const, isClearing: false };
let alerts: jest.SpyInstance;
function confirm() { return alerts.mock.calls.at(-1)![2].at(-1).onPress(); }
beforeEach(() => { mockUser = 1; mockSync = true; mockAvailable = true; clear.mockReset().mockResolvedValue(undefined); alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
afterEach(() => alerts.mockRestore());

test.each(['search', 'browse'] as const)('%s clear is inert before confirmation and failure offers direct retry', async kind => {
  clear.mockRejectedValueOnce(new Error('disk'));
  const hook = await renderHook(useClearHistoryAction);
  await act(() => { hook.result.current(kind, target); });
  expect(alerts.mock.calls.at(-1)![1]).toContain('其他 Kaku 设备');
  expect(clear).not.toHaveBeenCalled();
  expect(alerts.mock.calls.at(-1)![2][0]).toEqual({ text: '取消', style: 'cancel' });
  await act(async () => { await confirm(); });
  expect(alerts.mock.calls.at(-1)![0]).toBe('历史未能清除');
  await act(async () => { await confirm(); });
  expect(clear).toHaveBeenCalledTimes(2);
  expect(alerts.mock.calls.at(-1)![0]).toContain('已在本机清除');
});

test.each(['account', 'sync', 'availability', 'roundtrip'] as const)('%s changes invalidate old confirmations', async change => {
  const hook = await renderHook(useClearHistoryAction);
  await act(() => { hook.result.current('search', target); });
  const old = alerts.mock.calls.at(-1)![2].at(-1).onPress;
  if (change === 'account' || change === 'roundtrip') mockUser = 2;
  if (change === 'sync') mockSync = false;
  if (change === 'availability') mockAvailable = false;
  await hook.rerender(undefined);
  if (change === 'roundtrip') { mockUser = 1; await hook.rerender(undefined); }
  await act(async () => { await old(); });
  expect(clear).not.toHaveBeenCalled();
  expect(alerts.mock.calls.at(-1)![0]).toBe('账号或同步设置已变化');
});

test('a pending clear ignores duplicate confirmation and no longer reports after unmount', async () => {
  let resolve!: () => void;
  clear.mockReturnValueOnce(new Promise<void>(done => { resolve = done; }));
  const hook = await renderHook(useClearHistoryAction);
  await act(() => { hook.result.current('browse', target); });
  const yes = alerts.mock.calls.at(-1)![2].at(-1).onPress;
  let pending!: Promise<void>;
  await act(async () => { pending = yes(); await yes(); });
  expect(clear).toHaveBeenCalledTimes(1);
  await hook.unmount();
  await act(async () => { resolve(); await pending; });
  expect(alerts).toHaveBeenCalledTimes(1);
});

test('guest and sync-off scopes describe local effects, and unreadable history cannot be cleared', async () => {
  mockUser = undefined;
  const hook = await renderHook(useClearHistoryAction);
  await act(() => { hook.result.current('search', target); });
  expect(alerts.mock.calls.at(-1)![1]).toContain('本机访客');
  mockUser = 1; mockSync = false;
  await hook.rerender(undefined);
  await act(() => { hook.result.current('search', target); });
  expect(alerts.mock.calls.at(-1)![1]).toContain('当前只清除本机此账号');
  await act(() => { hook.result.current('search', { ...target, localStatus: 'read-error' }); });
  expect(alerts.mock.calls.at(-1)![0]).toBe('请先恢复历史记录');
  expect(clear).not.toHaveBeenCalled();
});
