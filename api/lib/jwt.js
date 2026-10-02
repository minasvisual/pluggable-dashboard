import crypto from 'crypto';

const b64urlJson = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

// Verifies an HS256 JWT (signature + exp/nbf). Returns the payload or throws.
export function verifyJwt(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [h, p, s] = parts;

  const header = b64urlJson(h);
  if (header.alg !== 'HS256') throw new Error('Unsupported algorithm');

  const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest();
  const given = Buffer.from(s, 'base64url');
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) {
    throw new Error('Invalid signature');
  }

  const payload = b64urlJson(p);
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp !== undefined && now >= payload.exp) throw new Error('Token expired');
  if (payload.nbf !== undefined && now < payload.nbf) throw new Error('Token not active yet');
  return payload;
}
