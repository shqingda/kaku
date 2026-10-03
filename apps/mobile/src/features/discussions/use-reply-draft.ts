import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { Alert, AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';
import { confirmDiscard as showDiscardConfirmation } from '@/features/shared/confirm-discard';

type DraftPhase = 'editing' | 'sent';

type DraftRevision = { version: number; users: number };
const revisions = new Map<string, DraftRevision>();

function retainRevision(key: string) {
  let revision = revisions.get(key);
  if (!revision) {
    revision = { version: 0, users: 0 };
    revisions.set(key, revision);
  }
  revision.users += 1;
  return revision;
}

function releaseRevision(key: string, revision: DraftRevision) {
  revision.users -= 1;
  if (revision.users === 0) revisions.delete(key);
}

// Synchronous writes persist each edit before background/unmount. Revisions live
// only while a composer or its request exists; no stored draft format changes.
export function useReplyDraft(key: string | null, initialContent = '', active = true, completedMessage = '回复已发送') {
  const [state, setState] = useState(() => {
    try {
      return {
        content: key ? Storage.getItemSync(key) ?? '' : initialContent,
        error: '',
        loaded: true,
        phase: 'editing' as DraftPhase,
      };
    } catch {
      return {
        content: '',
        error: '草稿读取失败，请重试后再编辑',
        loaded: false,
        phase: 'editing' as DraftPhase,
      };
    }
  });
  const latest = useRef(state.content);
  const sent = useRef(false);
  const persisted = useRef(state.content);
  const edit = useRef<{ revision: DraftRevision; version: number } | null>(null);
  const windowScope = useRef<object | null>(null);
  const confirmation = useRef<object | null>(null);
  const submitting = useRef(0);

  useEffect(() => {
    windowScope.current = active ? {} : null;
    return () => {
      windowScope.current = null;
      confirmation.current = null;
    };
  }, [active]);

  useEffect(() => {
    if (!key) return;
    const revision = retainRevision(key);
    edit.current = { revision, version: revision.version };
    return () => releaseRevision(key, revision);
  }, [key]);

  function save(content = latest.current) {
    if (!key) return true;
    try {
      if (content) Storage.setItemSync(key, content);
      else Storage.removeItemSync(key);
      persisted.current = content;
      setState((previous) => ({ ...previous, error: '' }));
      return true;
    } catch {
      setState((previous) => ({
        ...previous,
        error: sent.current
          ? `${completedMessage}，但草稿清理失败，请重试清理，勿重复发送`
          : '草稿保存失败，内容仍在当前窗口，请重试',
      }));
      return false;
    }
  }
  function change(value: SetStateAction<string>) {
    const content = typeof value === 'function' ? value(latest.current) : value;
    // Even a failed save is a newer edit that an older send must not clear.
    if (edit.current) edit.current.version = ++edit.current.revision.version;
    latest.current = content;
    setState((previous) => ({ ...previous, content }));
    save(content);
  }
  function retry() {
    if (sent.current) return complete();
    if (state.loaded) return save();
    try {
      const content = key ? Storage.getItemSync(key) ?? '' : initialContent;
      latest.current = content;
      persisted.current = content;
      if (edit.current) edit.current.version = edit.current.revision.version;
      setState({ content, error: '', loaded: true, phase: 'editing' });
      return true;
    } catch {
      return false;
    }
  }
  function clear() {
    if (!save('')) return false;
    if (edit.current) edit.current.version = ++edit.current.revision.version;
    latest.current = '';
    setState({
      content: '',
      error: '',
      loaded: true,
      phase: sent.current ? 'sent' : 'editing',
    });
    return true;
  }
  function complete() {
    sent.current = true;
    setState((previous) => ({ ...previous, error: '', phase: 'sent' }));
    if (edit.current && edit.current.version !== edit.current.revision.version) return true;
    try {
      // A previous composer may finish sending after a new one opened.
      if (key && Storage.getItemSync(key) !== persisted.current) return true;
    } catch {
      setState((previous) => ({
        ...previous,
        error: `${completedMessage}，但草稿清理失败，请重试清理，勿重复发送`,
        phase: 'sent',
      }));
      return false;
    }
    return clear();
  }
  async function submit<T>(send: () => Promise<T>) {
    // Account changes may unmount the sender before its request finishes. Keep
    // its revision shared with any reopened composer until cleanup completes.
    const revision = key ? retainRevision(key) : null;
    submitting.current += 1;
    try {
      const result = await send();
      return { result, cleared: complete() };
    } finally {
      submitting.current -= 1;
      if (key && revision) releaseRevision(key, revision);
    }
  }
  function confirmDiscard(onDiscarded: () => void, kind: 'draft' | 'unsaved' = 'draft') {
    const scope = windowScope.current;
    if (!scope || sent.current || submitting.current || confirmation.current) return;
    const token = {};
    const content = latest.current;
    const version = edit.current?.version;
    confirmation.current = token;
    function finish(discard: boolean) {
      if (confirmation.current !== token) return;
      confirmation.current = null;
      if (!discard || windowScope.current !== scope || sent.current || submitting.current) return;
      // The native alert can outlive the account, window, or text it described.
      if (latest.current !== content || edit.current?.revision.version !== version) {
        Alert.alert('草稿已更新', '原内容已保留，请重新查看后再选择丢弃。');
        return;
      }
      if (kind === 'unsaved' || clear()) onDiscarded();
    }
    showDiscardConfirmation(() => finish(true), kind, () => finish(false));
  }
  function dismiss() {
    if (sent.current) return complete();
    if (!state.loaded) return true;
    return save();
  }
  useEffect(() => {
    if (!active) return;
    const listener = AppState.addEventListener('change', (status) => {
      if (status === 'active' || !state.loaded) return;
      if (sent.current) complete();
      else save();
    });
    return () => listener.remove();
  }, [key, state.loaded, active]);

  return {
    ...state,
    phase: sent.current ? 'sent' : state.phase,
    change,
    clear,
    complete,
    submit,
    confirmDiscard,
    dismiss,
    retry,
    save,
  };
}
