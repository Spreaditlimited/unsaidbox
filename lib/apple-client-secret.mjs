import { createPrivateKey, sign } from 'node:crypto';

// Short-lived Apple client assertion, signed on the server; never sent to the browser.
export function appleClientSecret(settings, now = Math.floor(Date.now() / 1000)) {
  const key = createPrivateKey(settings.privateKey);
  if (key.asymmetricKeyType !== 'ec' || key.asymmetricKeyDetails?.namedCurve !== 'prime256v1')
    throw new Error('Apple requires a P-256 signing key');
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const input = `${encode({ alg: 'ES256', kid: settings.keyId })}.${encode({
    iss: settings.teamId, iat: now, exp: now + 300, aud: 'https://appleid.apple.com', sub: settings.clientId,
  })}`;
  return `${input}.${sign('sha256', Buffer.from(input), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url')}`;
}
