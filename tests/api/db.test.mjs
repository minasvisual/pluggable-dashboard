import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.ENTERTHESHADOWS_DATABASE_URL = 'mysql://user:pass@127.0.0.1:3306/ets';
process.env.ENTERTHESHADOWS_API_SECRET = 's3cret';
process.env.GAME_COMMERCE_API_SECRET = 'gc';
process.env.EMPTY_DATABASE_URL = 'mysql://user:pass@127.0.0.1:3306/empty';

const { tenantKey, getTenantEnv, getDatabase } = await import('../../api/lib/db.js');
const TENANT = 'entertheshadows';

test('tenantKey normalizes and validates', () => {
  assert.equal(tenantKey('game-commerce'), 'GAME_COMMERCE');
  assert.equal(tenantKey('gamecommerce'), 'GAMECOMMERCE');
  for (const bad of [undefined, null, 42, '', 'a b', '../x', 'a'.repeat(65)]) {
    assert.equal(tenantKey(bad), null);
  }
});

test('getTenantEnv reads <TENANT>_<SUFFIX>', () => {
  assert.equal(getTenantEnv('game-commerce', 'API_SECRET'), 'gc');
  assert.equal(getTenantEnv('entertheshadows', 'API_SECRET'), 's3cret');
  assert.equal(getTenantEnv('nope', 'API_SECRET'), undefined);
  assert.equal(getTenantEnv('../x', 'API_SECRET'), undefined);
});

test('getDatabase returns null for invalid or unconfigured tenants', () => {
  assert.equal(getDatabase('../x'), null);
  assert.equal(getDatabase('unconfigured'), null);
});

test('without a model: generic Model, one sequelize per tenant', () => {
  const a = getDatabase(TENANT);
  const b = getDatabase(TENANT);
  assert.equal(a.sequelize, b.sequelize);
  assert.equal(a.Model.tableName, 'models');
});

test('loads the requested entity', () => {
  const db = getDatabase(TENANT, 'Genres');
  assert.equal(db.Model.name, 'EtsGenres');
  assert.equal(db.Model.tableName, 'genres');
});

test('model lookup is case-insensitive and accepts the define name', () => {
  assert.equal(getDatabase(TENANT, 'artists').Model.name, 'EtsArtists');
  assert.equal(getDatabase(TENANT, 'EtsArtists').Model.name, 'EtsArtists');
});

test('related models are loaded and associated', () => {
  const db = getDatabase(TENANT, 'Artists');
  for (const name of ['EtsAlbums', 'EtsArtistVideos', 'EtsRating', 'EtsGenres', 'EtsArtistGenres', 'EtsConcerts', 'EtsBlogs', 'EtsProviders']) {
    assert.ok(db.models[name], `${name} should be loaded`);
  }
  assert.deepEqual(Object.keys(db.Model.associations).sort(), ['albums', 'blogs', 'events', 'genres', 'rate', 'videos']);
  // reverse side is defined by the related model
  assert.ok(db.models.EtsAlbums.associations.artist);
});

test('models are shared across calls and not associated twice', () => {
  const first = getDatabase(TENANT, 'Artists');
  const second = getDatabase(TENANT, 'Albums');
  assert.equal(second.models.EtsArtists, first.Model);
  assert.equal(Object.keys(first.Model.associations).length, 6);
});

test('unknown or unsafe model names return null', () => {
  for (const name of ['Nope', '../Artists', 'a/b', '', 42, 'x'.repeat(65)]) {
    assert.equal(getDatabase(TENANT, name), null, String(name));
  }
});

test('tenant without an entities folder returns null', () => {
  assert.equal(getDatabase('empty', 'Artists'), null);
});
