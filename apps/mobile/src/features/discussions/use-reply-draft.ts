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
  const dirty = useRef(false);
  const localVersion = useRef(0);
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

  function hasNewerEdit() {
    const current = edit.current;
    return Boolean(key && current && (
      revisions.get(key) !== current.revision || current.version !== current.revision.version
    ));
  }
  function reportConflict() {
    setState(previous => ({ ...previous, error: '草稿已在另一窗口更新，当前内容仍在此窗口；请重试并选择要保留的版本' }));
    return false;
  }
  function save(content = latest.current) {
    if (!windowScope.current && !sent.current) return false;
    if (!key) return true;
    if (!state.loaded) return false;
    if (hasNewerEdit()) return reportConflict();
    try {
      if (content) Storage.setItemSync(key, content);
      else Storage.removeItemSync(key);
      persisted.current = content;
      dirty.current = false;
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
    if (!windowScope.current || sent.current || submitting.current) return;
    const content = typeof value === 'function' ? value(latest.current) : value;
    const stale = hasNewerEdit();
    dirty.current = true;
    localVersion.current += 1;
    // Current owners advance before saving, including failures. A stale window
    // retains its edit separately until the user resolves the conflict.
    if (!stale && edit.current) edit.current.version = ++edit.current.revision.version;
    latest.current = content;
    setState((previous) => ({ ...previous, content }));
    if (stale) { reportConflict(); return; }
    save(content);
  }
  function resolveConflict() {
    const scope = windowScope.current;
    const current = edit.current;
    if (!key || !scope || !current || submitting.current || confirmation.current) return false;
    reportConflict();
    let stored: string | null;
    try { stored = Storage.getItemSync(key); } catch {
      setState(previous => ({ ...previous, error: '草稿读取失败，当前窗口内容已保留，请重试' }));
      return false;
    }
    const version = current.revision.version;
    const local = localVersion.current;
    const token = {};
    confirmation.current = token;
    const choose = (source: 'stored' | 'window' | 'cancel') => {
      if (confirmation.current !== token) return;
      confirmation.current = null;
      if (source === 'cancel' || windowScope.current !== scope || sent.current || submitting.current) return;
      try {
        if (revisions.get(key) !== current.revision || current.revision.version !== version
          || localVersion.current !== local || Storage.getItemSync(key) !== stored) {
          reportConflict();
          Alert.alert('草稿再次更新', '当前窗口内容已保留，请重试后重新选择。');
          return;
        }
      } catch {
        setState(previous => ({ ...previous, error: '草稿读取失败，当前窗口内容已保留，请重试' }));
        return;
      }
      current.version = ++current.revision.version;
      if (source === 'window') {
        // The user accepted replacing this saved fallback, even if saving fails.
        persisted.current = stored ?? '';
        dirty.current = true;
        save();
        return;
      }
      const content = stored ?? '';
      latest.current = content;
      persisted.current = content;
      dirty.current = false;
      localVersion.current += 1;
      setState({ content, error: '', loaded: true, phase: 'editing' });
    };
    Alert.alert('选择要保留的草稿', '使用本机草稿会替换当前窗口的内容；保存当前内容会覆盖本机草稿。取消会保留两个版本。', [
      { text: '取消', style: 'cancel', onPress: () => choose('cancel') },
      { text: '使用本机草稿', onPress: () => choose('stored') },
      { text: '保存当前内容', style: 'destructive', onPress: () => choose('window') },
    ], { cancelable: true, onDismiss: () => choose('cancel') });
    return false;
  }
  function retry() {
    if (!windowScope.current && !sent.current) return false;
    if (sent.current) return complete();
    if (state.loaded) return hasNewerEdit() ? resolveConflict() : save();
    try {
      const content = key ? Storage.getItemSync(key) ?? '' : initialContent;
      latest.current = content;
      persisted.current = content;
      dirty.current = false;
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
    localVersion.current += 1;
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
    if (hasNewerEdit()) return true;
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
    if (!windowScope.current) return false;
    if (sent.current) return complete();
    if (!state.loaded) return true;
    if (hasNewerEdit() && !dirty.current) return true;
    return save();
  }
  useEffect(() => {
    if (!active) return;
    const scope = windowScope.current;
    const listener = AppState.addEventListener('change', (status) => {
      if (scope !== windowScope.current || status === 'active' || !state.loaded) return;
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
