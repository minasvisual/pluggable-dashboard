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

// GET - List all or find by id
app.get('/api/models', async (req, res) => {
  try {
    const Model = await ensureDb(req);
    const id = req.query.id;
    if (id) {
      const item = await Model.findByPk(id);
      if (!item) return res.status(404).json({ error: 'Model not found' });
      return res.status(200).json(item);
    }
    const items = await Model.findAll();
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Entity routes: /api/models/:model (list) and /api/models/:model/:id (one),
// where :model is an entity from server/entities/<tenant>/ (e.g. EtsArtists)
app.get('/api/models/:model', async (req, res) => {
  try {
    const Model = await ensureDb(req, req.params.model);
    const { id} = req.query;
    if (id) {
      const item = await Model.findByPk(id);
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json(item);
    }
    const criteria = qr.convert({ query: req.query }); 
    const items = await Model.findAndCountAll(criteria)
    .then((result) => qr.pagination(result, req.query))

    res.status(200).json(items);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

app.get('/api/models/:model/:id', async (req, res) => {
  try {
    const Model = await ensureDb(req, req.params.model);
    const item = await Model.findByPk(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.status(200).json(item);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message });
  }
});

// POST - Create
app.post('/api/models', async (req, res) => {
  try {
    const Model = await ensureDb(req);
    const { name, domain, content } = req.body;
    if (!name || !domain) {
      return res.status(400).json({ error: 'Name and Domain are required' });
    }
    const item = await Model.create({ name, domain, content });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT - Update
const handleUpdate = async (req, res) => {
  try {
    const Model = await ensureDb(req);
    const id = req.params.id || req.query.id || req.body.id;
    if (!id) return res.status(400).json({ error: 'ID is required' });
    
    const item = await Model.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Model not found' });
    
    const { name, domain, content } = req.body;
    await item.update({
      name: name !== undefined ? name : item.name,
      domain: domain !== undefined ? domain : item.domain,
      content: content !== undefined ? content : item.content
    });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

app.put('/api/models', handleUpdate);
app.put('/api/models/:id', handleUpdate);

// DELETE - Delete
const handleDelete = async (req, res) => {
  try {
    const Model = await ensureDb(req);
    const id = req.params.id || req.query.id || req.body.id;
    if (!id) return res.status(400).json({ error: 'ID is required' });

    const item = await Model.findByPk(id);
    if (!item) return res.status(404).json({ error: 'Model not found' });

    await item.destroy();
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

app.delete('/api/models', handleDelete);
app.delete('/api/models/:id', handleDelete);

// Export default Vercel serverless handler routing requests to Express app
export default function handler(req, res) {
  return app(req, res);
}
