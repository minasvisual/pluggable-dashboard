import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { convert, pagination } = require('../../api/lib/queryparser.js')({ app: null });

test('throws when the query is not an object', () => {
  assert.throws(() => convert({ query: 'x' }), /Query must be object/);
});

test('empty query yields no criteria', () => {
  assert.deepEqual(convert({ query: {} }), {});
});

test('sort: ascending, descending and relation sorting', () => {
  assert.deepEqual(convert({ query: { sort: 'name,-id' } }).order, [['name', 'ASC'], ['id', 'DESC']]);
  assert.deepEqual(convert({ query: { sort: 'albums.-title' } }).order, [['albums', 'title', 'DESC']]);
});

test('sort: order=desc flips a bare sort field', () => {
  assert.deepEqual(convert({ query: { sort: 'name', order: 'DESC' } }).order, [['name', 'DESC']]);
});

test('sort: basedProperties whitelists fields', () => {
  const { order } = convert({ query: { sort: 'name,password' }, basedProperties: ['name'] });
  assert.deepEqual(order, [['name', 'ASC']]);
});

test('sort: duplicate fields are removed', () => {
  assert.deepEqual(convert({ query: { sort: 'name,-name' } }).order, [['name', 'ASC']]);
});

test('filter: operators and value coercion', () => {
  const q = { filter: ['name,like,%rock%', 'age,gte,18', 'status,eq,true', 'bio,eq,null'] };
  assert.deepEqual(convert({ query: q }).where, {
    name: { $like: '%rock%' },
    age: { $gte: '18' },
    status: { $eq: true },
    bio: { $eq: null },
  });
});

test('filter: list operators split on ":"', () => {
  assert.deepEqual(convert({ query: { filter: 'id,in,1:2:3' } }).where, { id: { $in: ['1', '2', '3'] } });
  assert.deepEqual(convert({ query: { filter: 'id,between,1:9' } }).where, { id: { $between: ['1', '9'] } });
});

test('filter: "a:b" fields become an OR group', () => {
  assert.deepEqual(convert({ query: { filter: 'name:city,like,%x%' } }).where, {
    $or: { name: { $like: '%x%' }, city: { $like: '%x%' } },
  });
});

test('filter: symbolic mode uses Symbol keys', () => {
  const where = convert({ query: { filter: 'age,gt,1' }, symbolic: true }).where;
  assert.equal(where.age[Symbol.for('gt')], '1');
});

test('filter: unknown operators are ignored', () => {
  assert.deepEqual(convert({ query: { filter: 'name,drop,x' } }).where, {});
});

test('pagination: limit/page become limit/offset', () => {
  const c = convert({ query: { limit: '10', page: '3' } });
  assert.equal(c.limit, 10);
  assert.equal(c.offset, 20);
});

test('pagination: raw offset is used without limit', () => {
  assert.equal(convert({ query: { offset: '5' } }).offset, 5);
});

test('fields and group', () => {
  const c = convert({ query: { fields: 'id,name', group: 'country' } });
  assert.deepEqual(c.attributes, ['id', 'name']);
  assert.equal(c.group, 'country');
});

test('include: plain and detailed associations', () => {
  assert.deepEqual(convert({ query: { include: 'albums' } }).include, [{ association: 'albums', as: 'albums' }]);
  assert.deepEqual(convert({ query: { include: 'albums:id,title::5:records:true' } }).include, [
    { association: 'albums', attributes: ['id', 'title'], as: 'records', required: true },
  ]);
});

test('pagination helper: rows without limit, pages with limit', async () => {
  const data = { count: 25, rows: [1, 2] };
  assert.deepEqual(await pagination(data, {}), [1, 2]);
  assert.deepEqual(await pagination(data, { limit: 10 }), { count: 25, rows: [1, 2], pages: 3 });
  assert.equal(await pagination(null, {}), null);
});
