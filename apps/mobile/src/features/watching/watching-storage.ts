import Storage from 'expo-sqlite/kv-store';

import type { WatchingItem } from './model';
import {
  decodeWatchingItems,
  encodeWatchingItems,
} from './watching-storage-codec';

const WATCHING_ITEMS_KEY = 'watching-items.v1';

export const watchingStorage = {
  async load(): Promise<WatchingItem[] | null> {
    const value = await Storage.getItem(WATCHING_ITEMS_KEY);
    return value === null ? null : decodeWatchingItems(value);
  },

  async save(items: WatchingItem[]): Promise<void> {
    await Storage.setItem(WATCHING_ITEMS_KEY, encodeWatchingItems(items));
  },
};
