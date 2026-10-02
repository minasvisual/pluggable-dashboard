import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyJwt } from '../../api/lib/jwt.js';

const SECRET = 'test-secret';
const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');

function sign(payload, { secret = SECRET, header = { alg: 'HS256', typ: 'JWT' } } = {}) {
  const data = `${b64(header)}.${b64(payload)}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${sig}`;
}

const now = () => Math.floor(Date.now() / 1000);

test('returns the payload for a valid token', () => {
  const payload = { id: 1, user_type: 'admin' };
  assert.deepEqual(verifyJwt(sign(payload), SECRET), payload);
});

test('rejects malformed tokens', () => {
  for (const token of [undefined, null, '', 'abc', 'a.b', 'a.b.c.d']) {
    assert.throws(() => verifyJwt(token, SECRET));
  }
});

test('rejects a wrong secret', () => {
  assert.throws(() => verifyJwt(sign({ id: 1 }, { secret: 'other' }), SECRET), /Invalid signature/);
});

test('rejects a tampered payload', () => {
  const [h, , s] = sign({ user_type: 'user' }).split('.');
  const forged = `${h}.${b64({ user_type: 'admin' })}.${s}`;
  assert.throws(() => verifyJwt(forged, SECRET), /Invalid signature/);
});

test('rejects algorithms other than HS256', () => {
  const none = `${b64({ alg: 'none' })}.${b64({ id: 1 })}.`;
  assert.throws(() => verifyJwt(none, SECRET), /Unsupported algorithm/);
  assert.throws(() => verifyJwt(sign({ id: 1 }, { header: { alg: 'HS512' } }), SECRET), /Unsupported algorithm/);
});

test('rejects expired tokens and accepts future exp', () => {
  assert.throws(() => verifyJwt(sign({ exp: now() - 10 }), SECRET), /expired/);
  assert.doesNotThrow(() => verifyJwt(sign({ exp: now() + 60 }), SECRET));
});

test('rejects tokens that are not active yet', () => {
  assert.throws(() => verifyJwt(sign({ nbf: now() + 60 }), SECRET), /not active/);
  assert.doesNotThrow(() => verifyJwt(sign({ nbf: now() - 60 }), SECRET));
});
