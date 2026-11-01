import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const mobileRequire = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
const forge = cliRequire('node-forge');

// CVE-2026-85393: the nested AlgorithmIdentifier must not accept extra children.
test('Expo signing tooling rejects nested DigestAlgorithm garbage and accepts valid signatures', () => {
  const { privateKey, publicKey } = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 65537 });
  const digest = forge.md.sha256.create().update('Kaku signature regression');
  assert.equal(publicKey.verify(digest.digest().bytes(), privateKey.sign(digest)), true);
  const a = forge.asn1;
  const algorithm = a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [
    a.create(a.Class.UNIVERSAL, a.Type.OID, false, a.oidToDer(forge.pki.oids.sha256).getBytes()),
    a.create(a.Class.UNIVERSAL, a.Type.NULL, false, ''),
    a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, false, 'unconsumed garbage'),
  ]);
  const malformed = a.create(a.Class.UNIVERSAL, a.Type.SEQUENCE, true, [
    algorithm,
    a.create(a.Class.UNIVERSAL, a.Type.OCTETSTRING, false, digest.digest().bytes()),
  ]);
  const signature = privateKey.sign(a.toDer(malformed).getBytes(), 'NONE');
  assert.throws(() => publicKey.verify(digest.digest().bytes(), signature), /DigestInfo/);
});
