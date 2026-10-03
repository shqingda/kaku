import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { useReplyDraft } from '@/features/discussions/use-reply-draft';
import { replyDraftKey } from '@/features/discussions/reply-draft';

jest.mock('expo-sqlite/kv-store', () => ({
  __esModule: true,
  default: { getItemSync: jest.fn(), setItemSync: jest.fn(), removeItemSync: jest.fn() },
}));
const data = new Map<string, string>();
beforeEach(() => {
  data.clear();
  jest.mocked(AppState.addEventListener).mockImplementation(() => ({ remove: jest.fn() }));
  jest.mocked(Storage.getItemSync).mockImplementation(key => data.get(key) ?? null);
  jest.mocked(Storage.setItemSync).mockImplementation((key, value) => { data.set(key, typeof value === 'function' ? value(data.get(key) ?? null) : value); });
  jest.mocked(Storage.removeItemSync).mockImplementation(key => data.delete(key));
});
test('persists latest edit through unmount and remount; successful send removes it', async () => {
  const key = replyDraftKey(1, { kind: 'episode', id: 2 });
  const first = await renderHook(() => useReplyDraft(key));
  await act(() => { first.result.current.change('first'); first.result.current.change('latest'); });
  await first.unmount();
  const second = await renderHook(() => useReplyDraft(key));
  expect(second.result.current.content).toBe('latest');
  await act(() => { expect(second.result.current.complete()).toBe(true); });
  expect(second.result.current.phase).toBe('sent');
  await second.unmount();
  const third = await renderHook(() => useReplyDraft(key));
  expect(third.result.current.content).toBe('');
});
test('account, target kind/id and reply recipient are isolated', () => {
  const keys = [
    replyDraftKey(1, { kind: 'episode', id: 2 }),
    replyDraftKey(2, { kind: 'episode', id: 2 }),
    replyDraftKey(1, { kind: 'subject-topic', id: 2 }),
    replyDraftKey(1, { kind: 'episode', id: 3 }),
    replyDraftKey(1, { kind: 'episode', id: 2 }, '7'),
  ];
  expect(new Set(keys).size).toBe(5);
});
test('failed save retains input and can retry without older text winning', async () => {
  jest.mocked(Storage.setItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
  const { result } = await renderHook(() => useReplyDraft('one'));
  await act(() => { result.current.change('retain me'); });
  expect(result.current.content).toBe('retain me');
  expect(result.current.error).toContain('保存失败');
  await act(() => { expect(result.current.retry()).toBe(true); });
  expect(data.get('one')).toBe('retain me');
  expect(result.current.error).toBe('');
});
test('read failure does not overwrite stored draft; retry restores it', async () => {
  data.set('one', 'existing');
  jest.mocked(Storage.getItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
  const { result } = await renderHook(() => useReplyDraft('one'));
  expect(result.current.loaded).toBe(false);
  expect(data.get('one')).toBe('existing');
  await act(() => { result.current.retry(); });
  expect(result.current.content).toBe('existing');
});
test('clear failure after sending is explicit and retries deletion instead of restoring text', async () => {
  data.set('one', 'sent');
  jest.mocked(Storage.removeItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
  const { result } = await renderHook(() => useReplyDraft('one'));
  await act(() => { expect(result.current.complete()).toBe(false); });
  expect(result.current.error).toContain('回复已发送');
  await act(() => { result.current.retry(); });
  expect(data.has('one')).toBe(false);
});
test('editing an existing reply never writes a draft', async () => {
  const { result } = await renderHook(() => useReplyDraft(null, 'original'));
  await act(() => { result.current.change('edited'); });
  expect(result.current.content).toBe('edited');
  expect(data.size).toBe(0);
});

test('late successful send cannot delete a newer draft for the same target', async () => {
  const old = await renderHook(() => useReplyDraft('one'));
  await act(() => { old.result.current.change('old reply'); });
  data.set('one', 'new reply');
  await act(() => { old.result.current.complete(); });
  expect(data.get('one')).toBe('new reply');
});

test('successful send clears its previous persisted text even when the last edit failed to save', async () => {
  data.set('one', 'previous text');
  const { result } = await renderHook(() => useReplyDraft('one'));
  jest.mocked(Storage.setItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
  await act(() => { result.current.change('sent text'); });
  expect(data.get('one')).toBe('previous text');
  await act(() => { expect(result.current.complete()).toBe(true); });
  expect(data.has('one')).toBe(false);
});

test('retrying a failed cleanup cannot delete a newer draft', async () => {
  data.set('one', 'old');
  const { result } = await renderHook(() => useReplyDraft('one'));
  jest.mocked(Storage.removeItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
  await act(() => { expect(result.current.complete()).toBe(false); });
  data.set('one', 'new draft');
  await act(() => { expect(result.current.retry()).toBe(true); });
  expect(data.get('one')).toBe('new draft');
});

test('closed composers do not write stale contents when the app enters background', async () => {
  const listener = jest.spyOn(AppState, 'addEventListener');
  listener.mockClear();
  const hook = await renderHook(() => useReplyDraft('one', '', false));
  expect(listener).not.toHaveBeenCalled();
  await hook.unmount();
  listener.mockRestore();
});

test('retrying old cleanup preserves a new edit even when its text is identical', async () => {
  const old = await renderHook(() => useReplyDraft('one'));
  await act(() => { old.result.current.change('same text'); });
  jest.mocked(Storage.removeItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
  await act(() => { expect(old.result.current.complete()).toBe(false); });
  const current = await renderHook(() => useReplyDraft('one'));
  await act(() => {
    current.result.current.change('revised');
    current.result.current.change('same text');
  });
  await act(() => { expect(old.result.current.retry()).toBe(true); });
  expect(data.get('one')).toBe('same text');
  expect(old.result.current.error).toBe('');
});

test('an old send preserves the saved fallback when a newer edit fails to save', async () => {
  const old = await renderHook(() => useReplyDraft('one'));
  await act(() => { old.result.current.change('saved fallback'); });
  const current = await renderHook(() => useReplyDraft('one'));
  jest.mocked(Storage.setItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
  await act(() => { current.result.current.change('new unsaved content'); });
  await act(() => { expect(old.result.current.complete()).toBe(true); });
  expect(data.get('one')).toBe('saved fallback');
  expect(current.result.current.error).toContain('保存失败');
  expect(current.result.current.content).toBe('new unsaved content');
  await act(() => { expect(current.result.current.retry()).toBe(true); });
  expect(data.get('one')).toBe('new unsaved content');
  await act(() => { expect(current.result.current.complete()).toBe(true); });
  expect(data.has('one')).toBe(false);
});

test('an old request preserves an identical new draft after both composers unmount', async () => {
  const old = await renderHook(() => useReplyDraft('one'));
  await act(() => { old.result.current.change('same text'); });
  let resolve!: () => void;
  const request = new Promise<void>(done => { resolve = done; });
  const submission = old.result.current.submit(() => request);
  await old.unmount();
  const current = await renderHook(() => useReplyDraft('one'));
  await act(() => {
    current.result.current.change('revised');
    current.result.current.change('same text');
  });
  await current.unmount();
  await act(async () => { resolve(); await submission; });
  expect(data.get('one')).toBe('same text');
  const reopened = await renderHook(() => useReplyDraft('one'));
  expect(reopened.result.current.content).toBe('same text');
  await act(async () => {
    expect((await reopened.result.current.submit(async () => 'ok')).cleared).toBe(true);
  });
  expect(data.has('one')).toBe(false);
});

test('a rejected request retains an unmounted draft and allows a new composer to send it', async () => {
  const old = await renderHook(() => useReplyDraft('one'));
  await act(() => { old.result.current.change('retry later'); });
  let reject!: (error: Error) => void;
  const request = new Promise<void>((_, fail) => { reject = fail; });
  const submission = old.result.current.submit(() => request);
  const rejected = expect(submission).rejects.toThrow('offline');
  await old.unmount();
  await act(async () => { reject(new Error('offline')); await rejected; });
  expect(data.get('one')).toBe('retry later');
  const current = await renderHook(() => useReplyDraft('one'));
  await act(async () => {
    expect((await current.result.current.submit(async () => 'ok')).cleared).toBe(true);
  });
  expect(data.has('one')).toBe(false);
});
