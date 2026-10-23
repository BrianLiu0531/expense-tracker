import cookieParser from 'cookie-parser';
import express from 'express';
import helmet from 'helmet';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { errorHandler } from './lib/http.js';
import { requireAuth } from './middleware/auth.js';
import { authRouter } from './routes/auth.js';
import { reportsRouter } from './routes/reports.js';
import { transactionsRouter } from './routes/transactions.js';

const here = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/transactions', requireAuth, transactionsRouter);
  app.use('/api/reports', requireAuth, reportsRouter);
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // In production the API also serves the built React app (single deployable unit)
  const clientDist = env.CLIENT_DIST ?? path.resolve(here, '../../client/dist');
  if (env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);
  return app;
}
