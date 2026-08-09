import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import Storage from 'expo-sqlite/kv-store';

export const queryPersister = createAsyncStoragePersister({
  key: 'kaku-public-query-cache',
  storage: Storage,
  throttleTime: 1_000,
});
