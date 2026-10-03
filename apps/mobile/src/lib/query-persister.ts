import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import Storage from 'expo-sqlite/kv-store';

import { deserializeQuerySnapshot, serializeQuerySnapshot } from './query-snapshot';

export const queryPersister = createAsyncStoragePersister({
  deserialize: deserializeQuerySnapshot,
  key: 'kaku-public-query-cache',
  serialize: serializeQuerySnapshot,
  storage: Storage,
  throttleTime: 1_000,
});
