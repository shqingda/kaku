import * as SecureStore from 'expo-secure-store';
import { parsePendingLogin, type PendingLogin } from './login-attempt';

let pendingWrite: Promise<void> = Promise.resolve();
function persistPending(operation: () => Promise<void>) {
  const task = pendingWrite.catch(() => undefined).then(operation);
  pendingWrite = task;
  return task;
}
const PENDING_LOGIN_KEY = 'kaku.auth.pending-login.v1';
const base64Url = (value: string) => value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export async function createLoginProof() {
  let Crypto: typeof import('expo-crypto');
  try {
    Crypto = require('expo-crypto');
  } catch {
    throw new Error('当前客户端缺少安全登录模块，请更新客户端后重试。');
  }
  const bytes = await Crypto.getRandomBytesAsync(32);
  const codeVerifier = base64Url(btoa(String.fromCharCode(...bytes)));
  const codeChallenge = base64Url(await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    codeVerifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  ));
  return { codeChallenge, pending: { codeVerifier, createdAt: Date.now(), requestId: Crypto.randomUUID() } };
}

export const loginAttemptStorage = {
  async load() {
    await pendingWrite.catch(() => undefined);
    const value = await SecureStore.getItemAsync(PENDING_LOGIN_KEY);
    if (!value) return null;
    const pending = parsePendingLogin(value);
    if (!pending) await persistPending(() => SecureStore.deleteItemAsync(PENDING_LOGIN_KEY));
    return pending;
  },
  async save(pending: PendingLogin) {
    await persistPending(() => SecureStore.setItemAsync(PENDING_LOGIN_KEY, JSON.stringify(pending)));
  },
  async clear() {
    await persistPending(() => SecureStore.deleteItemAsync(PENDING_LOGIN_KEY));
  },
};
