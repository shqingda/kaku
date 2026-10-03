import { act, renderHook } from '@testing-library/react-native';
import { Alert, AppState, type AppStateStatus } from 'react-native';
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

describe('concurrent draft saves', () => {
  let alerts: jest.SpiedFunction<typeof Alert.alert>;
  beforeEach(() => { alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
  afterEach(() => { alerts.mockRestore(); });
  const choice = (text: string) => alerts.mock.calls.at(-1)![2]!.find(button => button.text === text)!.onPress!;
  async function conflictingWindows() {
    const old = await renderHook(() => useReplyDraft('one'));
    await act(() => { old.result.current.change('original'); });
    const current = await renderHook(() => useReplyDraft('one'));
    await act(() => { current.result.current.change('new saved'); });
    await act(() => { old.result.current.change('local edit'); });
    expect(data.get('one')).toBe('new saved');
    return { old, current };
  }
  test('backgrounding an older window cannot restore a draft cleared by another window', async () => {
    const callbacks: Array<(status: AppStateStatus) => void> = [];
    jest.mocked(AppState.addEventListener).mockImplementation((_, listener) => {
      callbacks.push(listener);
      return { remove: jest.fn() };
    });
    const old = await renderHook(() => useReplyDraft('one'));
    await act(() => { old.result.current.change('old content'); });
    const current = await renderHook(() => useReplyDraft('one'));
    await act(() => { current.result.current.clear(); });
    await act(() => { callbacks[0]('background'); });
    expect(data.has('one')).toBe(false);
    expect(old.result.current.content).toBe('old content');
  });

  test('closing an unchanged older window leaves a newer saved draft intact', async () => {
    const old = await renderHook(() => useReplyDraft('one'));
    await act(() => { old.result.current.change('old'); });
    const current = await renderHook(() => useReplyDraft('one'));
    await act(() => { current.result.current.change('new'); });
    await act(() => { expect(old.result.current.dismiss()).toBe(true); });
    expect(data.get('one')).toBe('new');
  });

  test('a stale save retry cannot overwrite a newer draft without a choice', async () => {
    const old = await renderHook(() => useReplyDraft('one'));
    jest.mocked(Storage.setItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
    await act(() => { old.result.current.change('unsaved old window'); });
    const current = await renderHook(() => useReplyDraft('one'));
    await act(() => { current.result.current.change('new saved window'); });
    await act(() => { expect(old.result.current.retry()).toBe(false); });
    expect(data.get('one')).toBe('new saved window');
    expect(old.result.current.content).toBe('unsaved old window');
  });

  test('stale edits remain unsaved even when changed back to identical text; direct save and clear cannot overwrite', async () => {
    const { old } = await conflictingWindows();
    await act(() => { old.result.current.change('original'); });
    await act(() => {
      expect(old.result.current.save()).toBe(false);
      expect(old.result.current.clear()).toBe(false);
      expect(old.result.current.dismiss()).toBe(false);
    });
    expect(data.get('one')).toBe('new saved');
    expect(old.result.current.content).toBe('original');
    expect(old.result.current.error).toContain('另一窗口');
  });

  test('cancel preserves both versions; loading the saved version updates the editor without rewriting storage', async () => {
    const { old, current } = await conflictingWindows();
    await act(() => { old.result.current.retry(); });
    const cancelledChoice = choice('保存当前内容');
    await act(() => { choice('取消')(); });
    expect(old.result.current.content).toBe('local edit');
    expect(data.get('one')).toBe('new saved');
    await act(() => { old.result.current.retry(); });
    const calls = jest.mocked(Storage.setItemSync).mock.calls.length;
    await act(() => { choice('使用本机草稿')(); cancelledChoice(); });
    expect(old.result.current.content).toBe('new saved');
    expect(old.result.current.error).toBe('');
    expect(jest.mocked(Storage.setItemSync).mock.calls).toHaveLength(calls);
    await act(() => { expect(current.result.current.save()).toBe(false); });
    expect(data.get('one')).toBe('new saved');
  });

  test('choosing the deleted saved version empties the old editor without restoring its text', async () => {
    const { old, current } = await conflictingWindows();
    await act(() => { current.result.current.clear(); old.result.current.retry(); });
    await act(() => { choice('使用本机草稿')(); });
    expect(old.result.current.content).toBe('');
    expect(data.has('one')).toBe(false);
  });

  test('an explicitly chosen local version can fail to save and retry; an old sender cannot clear it', async () => {
    const { old, current } = await conflictingWindows();
    await act(() => { old.result.current.retry(); });
    jest.mocked(Storage.setItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
    const save = choice('保存当前内容');
    await act(() => { save(); save(); });
    expect(old.result.current.content).toBe('local edit');
    expect(old.result.current.error).toContain('保存失败');
    expect(data.get('one')).toBe('new saved');
    await act(() => { current.result.current.complete(); });
    expect(data.get('one')).toBe('new saved');
    await act(() => { expect(old.result.current.retry()).toBe(true); });
    expect(data.get('one')).toBe('local edit');
    await act(() => { current.result.current.retry(); });
    expect(data.get('one')).toBe('local edit');
  });

  test('sending after an explicitly chosen overwrite fails clears the accepted saved fallback', async () => {
    const { old } = await conflictingWindows();
    await act(() => { old.result.current.retry(); });
    jest.mocked(Storage.setItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
    await act(() => { choice('保存当前内容')(); });
    expect(data.get('one')).toBe('new saved');
    await act(async () => { await old.result.current.submit(async () => 'sent'); });
    expect(data.has('one')).toBe(false);
  });

  test('choosing unchanged window text still counts as unsaved intent if the write fails', async () => {
    const old = await renderHook(() => useReplyDraft('one'));
    await act(() => { old.result.current.change('original'); });
    const current = await renderHook(() => useReplyDraft('one'));
    await act(() => { current.result.current.change('new saved'); old.result.current.retry(); });
    jest.mocked(Storage.setItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
    await act(() => { choice('保存当前内容')(); });
    const third = await renderHook(() => useReplyDraft('one'));
    await act(() => { third.result.current.change('newest'); });
    await act(() => { expect(old.result.current.dismiss()).toBe(false); });
    expect(old.result.current.content).toBe('original');
    expect(data.get('one')).toBe('newest');
  });

  test.each(['newer editor', 'current input', 'storage'])('a conflict choice expires when %s changes', async (changed) => {
    const { old, current } = await conflictingWindows();
    await act(() => { old.result.current.retry(); });
    const save = choice('保存当前内容');
    await act(() => {
      if (changed === 'newer editor') current.result.current.change('newer again');
      if (changed === 'current input') { old.result.current.change('changed'); old.result.current.change('local edit'); }
      if (changed === 'storage') data.set('one', 'external update');
      save();
    });
    expect(data.get('one')).toBe(changed === 'newer editor' ? 'newer again' : changed === 'storage' ? 'external update' : 'new saved');
    expect(old.result.current.content).toBe('local edit');
    expect(alerts.mock.calls.at(-1)![0]).toBe('草稿再次更新');
  });

  test('read failures before and after a conflict choice keep both versions available', async () => {
    const { old } = await conflictingWindows();
    jest.mocked(Storage.getItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
    await act(() => { old.result.current.retry(); });
    expect(alerts).not.toHaveBeenCalled();
    expect(old.result.current.error).toContain('读取失败');
    await act(() => { old.result.current.retry(); });
    jest.mocked(Storage.getItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
    await act(() => { choice('使用本机草稿')(); });
    expect(data.get('one')).toBe('new saved');
    expect(old.result.current.content).toBe('local edit');
    expect(old.result.current.error).toContain('读取失败');
    await act(() => { old.result.current.retry(); });
    await act(() => { choice('使用本机草稿')(); });
    expect(old.result.current.content).toBe('new saved');
  });

  test('unmounted callbacks and a stale conflict choice cannot affect a reopened draft', async () => {
    const { old, current } = await conflictingWindows();
    await act(() => { old.result.current.retry(); });
    const save = choice('保存当前内容');
    const stale = old.result.current;
    await old.unmount();
    await current.unmount();
    const reopened = await renderHook(() => useReplyDraft('one'));
    await act(() => { reopened.result.current.change('reopened'); });
    await act(() => {
      stale.change('stale input');
      expect(stale.save()).toBe(false);
      expect(stale.clear()).toBe(false);
      expect(stale.retry()).toBe(false);
      expect(stale.dismiss()).toBe(false);
      save();
    });
    expect(data.get('one')).toBe('reopened');
    expect(reopened.result.current.content).toBe('reopened');
  });

  test('a pending conflict choice cannot save text after submission starts or finishes', async () => {
    const { old } = await conflictingWindows();
    await act(() => { old.result.current.retry(); });
    const save = choice('保存当前内容');
    let resolve!: () => void;
    const submission = old.result.current.submit(() => new Promise<void>(done => { resolve = done; }));
    await act(() => { save(); });
    expect(data.get('one')).toBe('new saved');
    await act(async () => { resolve(); await submission; old.result.current.retry(); });
    expect(old.result.current.phase).toBe('sent');
    expect(data.get('one')).toBe('new saved');
  });
});

describe('discard confirmation scope', () => {
  let alerts: jest.SpiedFunction<typeof Alert.alert>;
  const lastButtons = () => alerts.mock.calls.at(-1)![2]!;
  beforeEach(() => { alerts = jest.spyOn(Alert, 'alert').mockImplementation(() => {}); });
  afterEach(() => { alerts.mockRestore(); });

  test('cancel and Android dismissal allow a fresh confirmation; repeated taps and callbacks do not repeat deletion', async () => {
    const hook = await renderHook(() => useReplyDraft('one'));
    const closed = jest.fn();
    await act(() => { hook.result.current.change('keep until confirmed'); });
    hook.result.current.confirmDiscard(closed);
    const staleDiscard = lastButtons()[1].onPress!;
    hook.result.current.confirmDiscard(closed);
    expect(alerts).toHaveBeenCalledTimes(1);
    await act(() => { lastButtons()[0].onPress!(); });
    expect(data.get('one')).toBe('keep until confirmed');
    hook.result.current.confirmDiscard(closed);
    await act(() => { alerts.mock.calls.at(-1)![3]!.onDismiss!(); });
    hook.result.current.confirmDiscard(closed);
    const discard = lastButtons()[1].onPress!;
    await act(() => { staleDiscard(); });
    expect(data.get('one')).toBe('keep until confirmed');
    await act(() => { discard(); discard(); });
    expect(data.has('one')).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  test('hiding and reopening a window invalidates its old confirmation', async () => {
    const hook = await renderHook(({ active }: { active: boolean }) => useReplyDraft('one', '', active), { initialProps: { active: true } });
    const closed = jest.fn();
    await act(() => { hook.result.current.change('keep'); });
    hook.result.current.confirmDiscard(closed);
    const discard = lastButtons()[1].onPress!;
    await hook.rerender({ active: false });
    hook.result.current.confirmDiscard(closed);
    expect(alerts).toHaveBeenCalledTimes(1);
    await hook.rerender({ active: true });
    await act(() => { discard(); });
    expect(data.get('one')).toBe('keep');
    expect(closed).not.toHaveBeenCalled();
    hook.result.current.confirmDiscard(closed);
    await act(() => { lastButtons()[1].onPress!(); });
    expect(data.has('one')).toBe(false);
  });

  test.each(['same window', 'another window'])('new identical text in %s invalidates the old confirmation', async (where) => {
    const old = await renderHook(() => useReplyDraft('one'));
    const closed = jest.fn();
    await act(() => { old.result.current.change('same'); });
    old.result.current.confirmDiscard(closed);
    const discard = lastButtons()[1].onPress!;
    const current = where === 'same window' ? old : await renderHook(() => useReplyDraft('one'));
    await act(() => { current.result.current.change('different'); current.result.current.change('same'); });
    await act(() => { discard(); });
    expect(data.get('one')).toBe('same');
    expect(closed).not.toHaveBeenCalled();
    expect(alerts.mock.calls.at(-1)![0]).toBe('草稿已更新');
    current.result.current.confirmDiscard(closed);
    await act(() => { lastButtons()[1].onPress!(); });
    expect(data.has('one')).toBe(false);
  });

  test('a failed discard retains the editor and can be confirmed again', async () => {
    const hook = await renderHook(() => useReplyDraft('one'));
    const closed = jest.fn();
    await act(() => { hook.result.current.change('keep on failure'); });
    hook.result.current.confirmDiscard(closed);
    jest.mocked(Storage.removeItemSync).mockImplementationOnce(() => { throw new Error('disk'); });
    await act(() => { lastButtons()[1].onPress!(); });
    expect(data.get('one')).toBe('keep on failure');
    expect(hook.result.current.content).toBe('keep on failure');
    expect(hook.result.current.error).not.toBe('');
    expect(closed).not.toHaveBeenCalled();
    hook.result.current.confirmDiscard(closed);
    await act(() => { lastButtons()[1].onPress!(); });
    expect(data.has('one')).toBe(false);
    expect(closed).toHaveBeenCalledTimes(1);
  });

  test('an open discard confirmation cannot delete a draft once sending starts', async () => {
    const hook = await renderHook(() => useReplyDraft('one'));
    const closed = jest.fn();
    await act(() => { hook.result.current.change('sending'); });
    hook.result.current.confirmDiscard(closed);
    const discard = lastButtons()[1].onPress!;
    let reject!: (reason: Error) => void;
    const submission = hook.result.current.submit(() => new Promise<void>((_, fail) => { reject = fail; }));
    const rejected = expect(submission).rejects.toThrow('offline');
    await act(() => { discard(); });
    expect(data.get('one')).toBe('sending');
    expect(closed).not.toHaveBeenCalled();
    hook.result.current.confirmDiscard(closed);
    expect(alerts).toHaveBeenCalledTimes(1);
    await act(async () => { reject(new Error('offline')); await rejected; });
    hook.result.current.confirmDiscard(closed);
    await act(() => { lastButtons()[1].onPress!(); });
    expect(data.has('one')).toBe(false);
  });

  test('discarding an existing reply edit closes it without touching a stored draft', async () => {
    data.set('one', 'unrelated draft');
    const hook = await renderHook(() => useReplyDraft(null, 'original'));
    const closed = jest.fn();
    await act(() => { hook.result.current.change('edited'); });
    hook.result.current.confirmDiscard(closed, 'unsaved');
    await act(() => { lastButtons()[1].onPress!(); });
    expect(closed).toHaveBeenCalledTimes(1);
    expect(data.get('one')).toBe('unrelated draft');
  });
});
