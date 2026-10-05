import { Sequelize, DataTypes } from 'sequelize';
import mysql2 from 'mysql2';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const tenants = new Map();
const nodeRequire = createRequire(path.join(process.cwd(), 'package.json'));

// "game-commerce" / "gamecommerce" -> "GAME_COMMERCE" / "GAMECOMMERCE"
export function tenantKey(tenant) {
  if (typeof tenant !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(tenant)) return null;
  return tenant.replace(/-/g, '_').toUpperCase();
}

export function getTenantEnv(tenant, suffix) {
  const key = tenantKey(tenant);
  return key ? process.env[`${key}_${suffix}`] : undefined;
}

const entitiesDir = tenant => path.join(process.cwd(), 'server', 'entities', tenant);

// server/entities/<tenant>/<Model>.js -> { lowercaseName: fileName }
function listEntities(tenant) {
  try {
    const names = fs.readdirSync(entitiesDir(tenant)).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
    return Object.fromEntries(names.map(n => [n.toLowerCase(), n]));
  } catch (e) {
    return {};
  }
}

// Model names referenced by `models.X` in the entity's associate(), ignoring comments
function relatedNames(file) {
  const src = fs.readFileSync(file, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
  return [...new Set([...src.matchAll(/\bmodels\.(\w+)/g)].map(m => m[1]))];
}

// Loads one entity (and, recursively, every model it relates to) into the tenant's sequelize.
// Entity file names map to define names as <Prefix><File>, e.g. Artists.js -> EtsArtists.
function loadEntity(db, tenant, name, files, pending) {
  const base = name.replace(/^[A-Z][a-z]{1,3}(?=[A-Z])/, '');
  const fileName = files[name.toLowerCase()] || files[base.toLowerCase()];
  if (!fileName) return null;

  if (db.files[fileName]) return db.files[fileName];
  const file = path.join(entitiesDir(tenant), `${fileName}.js`);

  const factory = nodeRequire(file);
  const model = factory(db.sequelize, DataTypes, tenant);
  if (!model) return null;

  db.files[fileName] = model;
  db.models[model.name] = model;
  pending.push(model);
  relatedNames(file).forEach(rel => loadEntity(db, tenant, rel, files, pending));
  return model;
}

// One connection per tenant, read from <TENANT>_DATABASE_URL. Returns null when not configured.
// With `modelName`, the entity from server/entities/<tenant>/ (plus its related models) is loaded
// on demand and returned as `db.Model`; otherwise `db.Model` is the generic "models" table.
export function getDatabase(tenant, modelName) {
  const key = tenantKey(tenant);
  console.log(`[getDatabase] Tenant: ${tenant}, Key: ${key}, Model: ${modelName}`); // Log the tenant, key, and model name for debugging
  if (!key) return null;

  let db = tenants.get(key);
  console.log(`[getDatabase] db`, db);
  if (!db) {const key = tenantKey(tenant);
    console.log(`[getDatabase] db not found for tenant: ${tenant}, key: ${key}`); // Log when the database is not found for the tenant
    const dbUrl = process.env[`${key}_DATABASE_URL`];
    if (!dbUrl) return null;

    const sequelize = new Sequelize(dbUrl, {
      // explicit import so Vercel bundles the driver (Sequelize requires it dynamically)
      dialectModule: mysql2,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      },
      logging: false
    });

    const Model = sequelize.define('Model', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      domain: {
        type: DataTypes.STRING,
        allowNull: false
      },
      content: {
        type: DataTypes.JSON,
        allowNull: true
      }
    }, {
      tableName: 'models',
      timestamps: true
    });

    db = { sequelize, Model, models: {}, files: {} };
    tenants.set(key, db);
  }

  if (modelName === undefined) return db;
  if (typeof modelName !== 'string' || !/^[a-zA-Z0-9_]{1,64}$/.test(modelName)) return null;

  const files = listEntities(tenant);
  const pending = [];
  const entity = loadEntity(db, tenant, modelName, files, pending);
  if (!entity) return null;

  // associate only once every model in the relation graph is registered
  pending.forEach(m => typeof m.associate === 'function' && m.associate(db.models));

  return { ...db, Model: entity };
}
