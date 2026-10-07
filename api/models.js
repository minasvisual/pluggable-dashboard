import express from 'express';
import { getDatabase, getTenantEnv } from '../server/lib/db.js';
import { decodeJwt, verifyJwt } from '../server/lib/jwt.js';
import { queryparser } from '../server/lib/queryparser.js';

const ALLOWED_USER_TYPES = ['admin', 'master'];

const app = express();
const qr = queryparser({ app });
app.use(express.json());

// Tenant comes from the JWT's `tenante` claim.
// Validates the JWT with <TENANT>_API_SECRET and requires user_type admin|master.
app.use((req, res, next) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : req.headers['access-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  console.log(`[use] Token received: ${token.at(0)}...${token.slice(-4)}`); // Log only the first and last 4 characters for security

  try {
    // the claim only selects the secret; the signature check below is what authenticates it
    const tenant = decodeJwt(token).tenante;
    const secret = getTenantEnv(tenant, 'API_SECRET');
    console.log(`[use] Tenant: ${tenant}, Secret: ${secret ? secret.slice(-4) : 'Not found'}`); // Log whether the secret was found, but not the secret itself
    if (!secret) return res.status(401).json({ error: 'Unauthorized' });

    const payload = verifyJwt(token, secret);
    console.log(`[use] Payload: ${JSON.stringify(payload)}`); // Log the payload for debugging
    if (!ALLOWED_USER_TYPES.includes(payload.user_type)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    req.user = payload;
    req.tenant = payload.tenante;
  } catch (e) {
    console.error(`[use] JWT verification failed: ${e.message}`, e); // Log the error message for debugging
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Helper to ensure the tenant database is synced
async function ensureDb(req, modelName) {
  const db = getDatabase(req.tenant, modelName);
  if (!db) {
    // unknown model: fail before any query reaches the database
    const err = new Error(modelName ? `Model "${modelName}" not found for tenant` : 'Database not configured for tenant');
    err.status = modelName ? 404 : 500;
    throw err;
  }
  // await db.sequelize.sync();
  return db.Model;
}

// Entity routes: /api/models/:model (list) and /api/models/:model/:id (one),
// where :model is an entity from server/entities/<tenant>/ (e.g. EtsArtists)
app.get('/api/models/:model', async (req, res) => {
  try {
    const Model = await ensureDb(req, req.params.model); 
    // symbolic: Sequelize 6+ rejects string operators ('$ne'), it needs Op symbols
    const criteria = qr.convert({ query: req.query, symbolic: true });
    const items = await Model.findAndCountAll(criteria)
    .then((result) => qr.pagination(result, req.query))

    res.status(200).json(items);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Maps errors to a status: explicit status, Sequelize validation/constraint -> 400, else 500
function sendError(res, error) {
  const isValidation = ['SequelizeValidationError', 'SequelizeUniqueConstraintError', 'SequelizeForeignKeyConstraintError']
    .includes(error.name);
  res.status(error.status || (isValidation ? 400 : 500)).json({ error: error.message });
}

// The primary key column can be overridden with ?pk=<column> (default "id")
const getPk = (req) => req.query.pk || 'id';

app.get('/api/models/:model/:id', async (req, res) => {
  try {
    const Model = await ensureDb(req, req.params.model);
    const PK = getPk(req);
    // keep the query-parser options (attributes, include...) but force the key filter
    const criteria = { ...qr.convert({ query: req.query, symbolic: true }), where: { [PK]: req.params.id } };
    const item = await Model.findOne(criteria);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(item);
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/models/:model', async (req, res) => {
  try {
    const Model = await ensureDb(req, req.params.model);
    const item = await Model.create(req.body);
    res.status(201).json(item);
  } catch (error) {
    sendError(res, error);
  }
});

const updateEntity = async (req, res) => {
  try {
    const Model = await ensureDb(req, req.params.model);
    const where = { [getPk(req)]: req.params.id };
    const item = await Model.findOne({ where });
    if (!item) return res.status(404).json({ error: 'Not found' });
    await item.update(req.body);
    res.status(200).json(item);
  } catch (error) {
    sendError(res, error);
  }
};

app.put('/api/models/:model/:id', updateEntity);
app.patch('/api/models/:model/:id', updateEntity);

app.delete('/api/models/:model/:id', async (req, res) => {
  try {
    const Model = await ensureDb(req, req.params.model);
    const deleted = await Model.destroy({ where: { [getPk(req)]: req.params.id } });
    if (!deleted) return res.status(404).json({ error: 'Not found' });
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    sendError(res, error);
  }
});

// Export default Vercel serverless handler routing requests to Express app
export default function handler(req, res) {
  return app(req, res);
}
