const TOKEN_VERSION = 'v1';

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(value: string) {
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = atob(padded);

  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function importEncryptionKey(base64Key: string) {
  const keyBytes = base64UrlToBytes(base64Key);

  if (keyBytes.byteLength !== 32) {
    throw new Error('TOKEN_ENCRYPTION_KEY must contain exactly 32 bytes');
  }

  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM' },
    false,
    ['decrypt', 'encrypt'],
  );
}

export function createRandomToken(byteLength = 32) {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function hashToken(value: string) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(value),
  );

  return bytesToBase64Url(new Uint8Array(digest));
}

export async function encryptSecret(value: string, base64Key: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importEncryptionKey(base64Key);
  const encrypted = await crypto.subtle.encrypt(
    { iv, name: 'AES-GCM' },
    key,
    new TextEncoder().encode(value),
  );

  return [
    TOKEN_VERSION,
    bytesToBase64Url(iv),
    bytesToBase64Url(new Uint8Array(encrypted)),
  ].join('.');
}

export async function decryptSecret(value: string, base64Key: string) {
  const [version, encodedIv, encodedCiphertext] = value.split('.');

  if (version !== TOKEN_VERSION || !encodedIv || !encodedCiphertext) {
    throw new Error('Unsupported encrypted token format');
  }

  const key = await importEncryptionKey(base64Key);
  const decrypted = await crypto.subtle.decrypt(
    { iv: base64UrlToBytes(encodedIv), name: 'AES-GCM' },
    key,
    base64UrlToBytes(encodedCiphertext),
  );

  return new TextDecoder().decode(decrypted);
}
