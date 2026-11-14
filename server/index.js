import express from 'express';
import { initSchema } from './db.js';
import { attachUser } from './auth.js';
import {
  challengeHandler,
  rateLimit,
  requireCsrf,
  requireJson,
  securityHeaders,
} from './security.js';
import authRoutes from './auth-routes.js';
import linkedinRoutes from './linkedin.js';
import ideasRouter from './ideas.js';
import { ensureDemoUser } from './demo.js';

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(securityHeaders);
app.use(express.json({ limit: '64kb' }));

const api = express.Router();

api.use(attachUser);
api.get('/health', (_req, res) => res.json({ ok: true }));

const challengeLimit = rateLimit({ key: 'challenge', windowMs: 60 * 1000, max: 60 });
api.get('/challenge', challengeLimit, challengeHandler);

// Every state-changing call needs a JSON body and the CSRF double-submit token.
api.use(requireJson, requireCsrf);

api.use('/auth/linkedin', linkedinRoutes);
api.use('/auth', authRoutes);
api.use('/ideas', ideasRouter);

api.use((_req, res) => res.status(404).json({ error: 'Not found' }));

app.use('/api', api);

app.use((error, _req, res, _next) => {
  if (res.headersSent) return;
  console.error(error);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

async function start() {
  await initSchema();
  await ensureDemoUser();
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Just Idea API listening on ${PORT}`);
  });
}

start().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
