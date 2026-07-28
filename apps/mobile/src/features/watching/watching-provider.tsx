import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '@/constants/design';

import { INITIAL_WATCHING_ITEMS } from './mock-data';
import type { WatchingItem } from './model';
import { resizeWatchedEpisodes } from './progress';
import { watchingStorage } from './watching-storage';

type WatchingContextValue = {
  items: WatchingItem[];
  setWatchedEpisodeCount: (
    subject: WatchingItem,
    watchedCount: number,
  ) => void;
  toggleEpisodeWatched: (
    subject: WatchingItem,
    episodeNumber: number,
  ) => void;
};

type LoadState = 'error' | 'loading' | 'ready';
type SaveState = 'error' | 'ready' | 'saving';

const WatchingContext = createContext<WatchingContextValue | null>(null);

// The provider keeps UI state responsive while device writes run in order.
export function WatchingProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<WatchingItem[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [saveState, setSaveState] = useState<SaveState>('ready');
  const itemsRef = useRef<WatchingItem[]>([]);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const saveVersionRef = useRef(0);

  const loadItems = useCallback(async () => {
    setLoadState('loading');

    try {
      const storedItems = await watchingStorage.load();
      const nextItems = storedItems ?? INITIAL_WATCHING_ITEMS;
      itemsRef.current = nextItems;
      setItems(nextItems);
      setLoadState('ready');
    } catch {
      setLoadState('error');
    }
  }, []);

  const persistItems = useCallback((nextItems: WatchingItem[]) => {
    const version = saveVersionRef.current + 1;
    saveVersionRef.current = version;
    setSaveState('saving');

    const saveTask = saveQueueRef.current
      .catch(() => undefined)
      .then(() => watchingStorage.save(nextItems));

    saveQueueRef.current = saveTask;

    void saveTask
      .then(() => {
        if (version === saveVersionRef.current) {
          setSaveState('ready');
        }
      })
      .catch(() => {
        if (version === saveVersionRef.current) {
          setSaveState('error');
        }
      });
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (loadState !== 'ready') {
      return;
    }

    itemsRef.current = items;
    persistItems(items);
  }, [items, loadState, persistItems]);

  function toggleEpisodeWatched(
    subject: WatchingItem,
    episodeNumber: number,
  ) {
    setItems((current) => {
      const existing = current.find((item) => item.id === subject.id);
      const item = existing ?? subject;
      const watchedEpisodeNumbers = item.watchedEpisodeNumbers.includes(
        episodeNumber,
      )
        ? item.watchedEpisodeNumbers.filter(
            (number) => number !== episodeNumber,
          )
        : [...item.watchedEpisodeNumbers, episodeNumber].sort(
            (left, right) => left - right,
          );
      const nextItem = { ...item, watchedEpisodeNumbers };

      return existing
        ? current.map((currentItem) =>
            currentItem.id === subject.id ? nextItem : currentItem,
          )
        : [...current, nextItem];
    });
  }

  function setWatchedEpisodeCount(
    subject: WatchingItem,
    watchedCount: number,
  ) {
    setItems((current) => {
      const existing = current.find((item) => item.id === subject.id);

      if (!existing && watchedCount === 0) {
        return current;
      }

      const item = existing ?? subject;
      const nextItem = {
        ...item,
        watchedEpisodeNumbers: resizeWatchedEpisodes(
          item.watchedEpisodeNumbers,
          watchedCount,
          item.totalEpisodes,
        ),
      };

      return existing
        ? current.map((currentItem) =>
            currentItem.id === subject.id ? nextItem : currentItem,
          )
        : [...current, nextItem];
    });
  }

  if (loadState !== 'ready') {
    return (
      <View style={styles.bootstrap}>
        <Text style={styles.bootstrapTitle}>
          {loadState === 'loading' ? '正在读取观看进度' : '观看进度读取失败'}
        </Text>
        <Text style={styles.bootstrapText}>
          {loadState === 'loading'
            ? '正在打开设备上的本地数据。'
            : '本地数据没有被覆盖，可以重试读取。'}
        </Text>
        {loadState === 'error' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void loadItems()}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retryText}>重试</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <WatchingContext.Provider
      value={{
        items,
        setWatchedEpisodeCount,
        toggleEpisodeWatched,
      }}
    >
      {children}
      {saveState === 'error' ? (
        <View style={styles.saveError}>
          <View style={styles.saveErrorCopy}>
            <Text style={styles.saveErrorTitle}>进度尚未保存到设备</Text>
            <Text style={styles.saveErrorText}>当前修改仍在内存中。</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => persistItems(itemsRef.current)}
            style={({ pressed }) => [
              styles.retrySaveButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.retrySaveText}>重试</Text>
          </Pressable>
        </View>
      ) : null}
    </WatchingContext.Provider>
  );
}

export function useWatching() {
  const context = useContext(WatchingContext);

  if (!context) {
    throw new Error('useWatching must be used inside WatchingProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  bootstrap: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    flex: 1,
    justifyContent: 'center',
    padding: 32,
  },
  bootstrapTitle: {
    color: COLORS.ink,
    fontSize: 20,
    fontWeight: '800',
  },
  bootstrapText: {
    color: COLORS.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    marginTop: 18,
    paddingHorizontal: 20,
    paddingVertical: 11,
  },
  retryText: { color: COLORS.surface, fontSize: 14, fontWeight: '800' },
  saveError: {
    alignItems: 'center',
    backgroundColor: COLORS.ink,
    borderRadius: 18,
    bottom: 24,
    flexDirection: 'row',
    left: 20,
    padding: 14,
    position: 'absolute',
    right: 20,
    shadowColor: '#000000',
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  saveErrorCopy: { flex: 1 },
  saveErrorTitle: {
    color: COLORS.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  saveErrorText: {
    color: COLORS.subtle,
    fontSize: 11,
    marginTop: 4,
  },
  retrySaveButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 11,
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  retrySaveText: { color: COLORS.ink, fontSize: 12, fontWeight: '800' },
  pressed: { opacity: 0.62 },
});
