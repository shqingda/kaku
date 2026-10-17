function base64url(bytes: Uint8Array) {
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

// Web Crypto returns the P1363 ECDSA form required by JWT (not ASN.1 DER).
export async function signProviderJwt(
  pem: string, algorithm: 'RS256' | 'ES256',
  header: Record<string, string>, claims: Record<string, string | number>,
) {
  const encoded = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, '');
  const bytes = Uint8Array.from(atob(encoded), char => char.charCodeAt(0));
  const rsa = algorithm === 'RS256';
  const key = await crypto.subtle.importKey('pkcs8', bytes,
    rsa ? { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } : { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const encode = (value: object) => base64url(new TextEncoder().encode(JSON.stringify(value)));
  const input = `${encode({ alg: algorithm, typ: 'JWT', ...header })}.${encode(claims)}`;
  const signature = await crypto.subtle.sign(
    rsa ? 'RSASSA-PKCS1-v1_5' : { name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(input));
  return `${input}.${base64url(new Uint8Array(signature))}`;
}
