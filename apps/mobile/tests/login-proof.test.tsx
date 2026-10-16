import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createLoginProof, loginAttemptStorage } from '@/features/auth/login-proof';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' }, CryptoEncoding: { BASE64: 'base64' },
  getRandomBytesAsync: jest.fn(async () => Uint8Array.from(atob('dBjftJeZ4CVP+mB92K27uhbUJU1p1r/wW1gFWFOEjXk='), character => character.charCodeAt(0))),
  digestStringAsync: jest.fn(async (_: string, value: string) => require('node:crypto').createHash('sha256').update(value).digest('base64')),
  randomUUID: () => '498e27b7-5192-48ce-9b13-f4a27f10f806',
}));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
beforeEach(() => jest.clearAllMocks());

test('login proof follows the S256 reference vector with asynchronous native random bytes', async () => {
  const proof = await createLoginProof();
  expect(proof.pending.codeVerifier).toBe('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk');
  expect(proof.codeChallenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(32);
  expect(Crypto.digestStringAsync).toHaveBeenCalledWith('SHA-256', proof.pending.codeVerifier, { encoding: 'base64' });
});

test('pending proof storage uses its own key and preserves the existing auth session key', async () => {
  const { pending } = await createLoginProof();
  await loginAttemptStorage.save(pending);
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(JSON.stringify(pending));
  expect(await loginAttemptStorage.load()).toEqual(pending);
  await loginAttemptStorage.clear();
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('kaku.auth.pending-login.v1', JSON.stringify(pending));
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('kaku.auth.pending-login.v1');
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalledWith('kaku.auth.session.v1');
});
