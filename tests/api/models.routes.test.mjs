// Needs --experimental-test-module-mocks (see "test:api" in package.json).
import { test, mock, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';

process.env.ACME_API_SECRET = 'acme-secret';

// In-memory stand-in for the sequelize "models" table
let rows;
let nextId;
const fakeModel = {
  findAll: async () => rows,
  findByPk: async id => {
    const row = rows.find(r => String(r.id) === String(id));
    return row && { ...row, update: async data => Object.assign(row, data), destroy: async () => { rows = rows.filter(r => r !== row); } };
  },
  create: async data => { const row = { id: nextId++, ...data }; rows.push(row); return row; },
};

const dbUrl = new URL('../../api/lib/db.js', import.meta.url).href;
mock.module(dbUrl, {
  exports: {
    getTenantEnv: (tenant, suffix) => process.env[`${String(tenant).toUpperCase()}_${suffix}`],
    getDatabase: tenant => (tenant === 'acme' ? { sequelize: { sync: async () => {} }, Model: fakeModel } : null),
  },
});

const { default: handler } = await import('../../api/models.js');

const b64 = obj => Buffer.from(JSON.stringify(obj)).toString('base64url');
function token(payload, secret = 'acme-secret') {
  const data = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64(payload)}`;
  return `${data}.${crypto.createHmac('sha256', secret).update(data).digest('base64url')}`;
}

let server;
let base;
before(async () => {
  server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
beforeEach(() => {
  rows = [{ id: 1, name: 'a', domain: 'x', content: null }];
  nextId = 2;
});

function call(path, { method = 'GET', body, tenant = 'acme', jwt = token({ user_type: 'admin' }), headers = {} } = {}) {
  return fetch(base + path, {
    method,
    headers: {
      ...(tenant && { 'x-tenant': tenant }),
      ...(jwt && { authorization: `Bearer ${jwt}` }),
      ...(body && { 'content-type': 'application/json' }),
      ...headers,
    },
    body: body && JSON.stringify(body),
  });
}

test('400 for a missing or unknown tenant', async () => {
  assert.equal((await call('/api/models', { tenant: null })).status, 400);
  assert.equal((await call('/api/models', { tenant: 'ghost' })).status, 400);
});

test('401 without a token, with a bad signature or when expired', async () => {
  assert.equal((await call('/api/models', { jwt: null })).status, 401);
  assert.equal((await call('/api/models', { jwt: token({ user_type: 'admin' }, 'wrong') })).status, 401);
  assert.equal((await call('/api/models', { jwt: token({ user_type: 'admin', exp: 1 }) })).status, 401);
});

test('accepts the token from the access-token header', async () => {
  const res = await call('/api/models', { jwt: null, headers: { 'access-token': token({ user_type: 'master' }) } });
  assert.equal(res.status, 200);
});

test('tenant can come from the query string', async () => {
  const res = await call('/api/models?tenant=acme', { tenant: null });
  assert.equal(res.status, 200);
});

test('403 for user types other than admin/master', async () => {
  assert.equal((await call('/api/models', { jwt: token({ user_type: 'user' }) })).status, 403);
});

test('GET lists and finds by id', async () => {
  assert.deepEqual(await (await call('/api/models')).json(), rows);
  const one = await call('/api/models/1');
  assert.equal(one.status, 200);
  assert.equal((await one.json()).name, 'a');
  assert.equal((await call('/api/models?id=1')).status, 200);
  assert.equal((await call('/api/models/99')).status, 404);
});

test('POST creates and validates required fields', async () => {
  const res = await call('/api/models', { method: 'POST', body: { name: 'b', domain: 'y', content: { k: 1 } } });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).id, 2);
  assert.equal(rows.length, 2);
  assert.equal((await call('/api/models', { method: 'POST', body: { name: 'b' } })).status, 400);
});

test('PUT updates only the given fields', async () => {
  const res = await call('/api/models/1', { method: 'PUT', body: { name: 'renamed' } });
  assert.equal(res.status, 200);
  assert.equal(rows[0].name, 'renamed');
  assert.equal(rows[0].domain, 'x');
  assert.equal((await call('/api/models/99', { method: 'PUT', body: { name: 'z' } })).status, 404);
  assert.equal((await call('/api/models', { method: 'PUT', body: { name: 'z' } })).status, 400);
});

test('DELETE removes the record', async () => {
  assert.equal((await call('/api/models/1', { method: 'DELETE' })).status, 200);
  assert.equal(rows.length, 0);
  assert.equal((await call('/api/models/1', { method: 'DELETE' })).status, 404);
  assert.equal((await call('/api/models', { method: 'DELETE' })).status, 400);
});
