import * as SecureStore from 'expo-secure-store';

import { parseStoredAuthSession } from './auth-session';
import type { AuthSession } from './model';

const AUTH_SESSION_KEY = 'kaku.auth.session.v1';

export const authStorage = {
  async clear() {
    await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
  },

  async load(): Promise<AuthSession | null> {
    const stored = await SecureStore.getItemAsync(AUTH_SESSION_KEY);

    if (!stored) {
      return null;
    }

    const session = parseStoredAuthSession(stored);

    if (!session) {
      await this.clear();
      return null;
    }

    return session;
  },

  async save(session: AuthSession) {
    await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
  },
};
