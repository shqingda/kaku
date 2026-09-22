import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { AppState } from 'react-native';
import Storage from 'expo-sqlite/kv-store';

const STORAGE_PREFIX = 'kaku:episode-comment-scroll:v1:';

type ScrollableList = {
  scrollToOffset: (options: { animated: boolean; offset: number }) => void;
};

function storageKey(episodeId: number) {
  return `${STORAGE_PREFIX}${episodeId}`;
}

function readPosition(episodeId: number) {
  try {
    const value = Number(Storage.getItemSync(storageKey(episodeId)));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

function writePosition(episodeId: number, offset: number) {
  try {
    if (offset > 0) {
      Storage.setItemSync(storageKey(episodeId), String(offset));
    } else {
      Storage.removeItemSync(storageKey(episodeId));
    }
  } catch {
    // 位置记忆是渐进增强；存储不可用时仍保留正常的评论浏览能力。
  }
}

export function useEpisodeCommentScrollPosition(
  episodeId: number | undefined,
  listRef: { current: ScrollableList | null },
) {
  const currentEpisodeIdRef = useRef<number | undefined>(undefined);
  const currentOffsetRef = useRef(0);
  const restoreOffsetRef = useRef(0);
  const restoredRef = useRef(false);

  const save = useCallback(() => {
    if (!currentEpisodeIdRef.current || !restoredRef.current) return;
    writePosition(currentEpisodeIdRef.current, currentOffsetRef.current);
  }, []);

  useLayoutEffect(() => {
    currentEpisodeIdRef.current = episodeId;
    const offset = episodeId ? readPosition(episodeId) : 0;
    currentOffsetRef.current = offset;
    restoreOffsetRef.current = offset;
    restoredRef.current = false;

    return save;
  }, [episodeId, save]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', (status) => {
      if (status !== 'active') save();
    });
    return () => listener.remove();
  }, [save]);

  const restore = useCallback(
    (maxOffset: number) => {
      if (!currentEpisodeIdRef.current || restoredRef.current) return;
      const offset = Math.min(
        restoreOffsetRef.current,
        Math.max(0, maxOffset),
      );
      currentOffsetRef.current = offset;
      restoredRef.current = true;
      // 同一个路由切换上一/下一集时 FlashList 会复用实例；即使目标是 0，
      // 也要显式复位，不能继承上一集的原生 contentOffset。
      listRef.current?.scrollToOffset({ animated: false, offset });
    },
    [listRef],
  );

  const track = useCallback((offset: number) => {
    if (!restoredRef.current) return;
    currentOffsetRef.current = Math.max(0, offset);
  }, []);

  return { restore, save, track };
}
