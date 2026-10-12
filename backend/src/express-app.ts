import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { connectDatabase } from './config/database';
import { env } from './config/env';
import { swaggerDocument } from './config/swagger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { authRouter } from './routes/auth.routes';
import { borrowerRouter } from './routes/borrower.routes';
import { opsRouter } from './routes/ops.routes';

export const app = express();
const API_V1_PREFIX = '/api/v1';
const swaggerContentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "font-src 'self' https: data:",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "img-src 'self' data: https:",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https:",
].join('; ');

const configuredFrontendOrigins = env.frontendUrl
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigins =
  env.nodeEnv === 'production'
    ? configuredFrontendOrigins
    : [...configuredFrontendOrigins, /^http:\/\/(localhost|127\.0\.0\.1|\[::1\]):\d+$/];

app.use(helmet());
app.use('/api-docs', (_req, res, next) => {
  // Swagger UI loads a browser-side initializer and needs inline styles.
  // Scope this relaxed policy to documentation assets only.
  res.setHeader('Content-Security-Policy', swaggerContentSecurityPolicy);
  next();
});
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Vercel invokes this Express app as a serverless function. Keep database
// access lazy so health checks and API documentation remain available while
// the database is unavailable, and connect only for database-backed routes.
app.use((req, _res, next) => {
  const isHealthRoute = req.path === '/health' || req.path === `${API_V1_PREFIX}/health`;
  const isApiRoute = req.path.startsWith(`${API_V1_PREFIX}/`);
  const isDocumentationRoute = req.path === '/api-docs' || req.path.startsWith('/api-docs/');

  if (!isApiRoute || isHealthRoute || isDocumentationRoute) {
    next();
    return;
  }

  connectDatabase()
    .then(() => next())
    .catch(next);
});

const healthHandler = (_req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok', service: 'creditsea-lms-api' });
};

app.get('/health', healthHandler);
app.get(`${API_V1_PREFIX}/health`, healthHandler);

app.get('/api-docs.json', (_req, res) => {
  res.status(200).json(swaggerDocument);
});

const swaggerUiHandler = swaggerUi.setup(swaggerDocument, {
  customSiteTitle: 'CreditSea API Documentation',
  swaggerOptions: {
    displayRequestDuration: true,
    persistAuthorization: true,
    filter: true,
    tryItOutEnabled: true,
  },
});

// Serve Swagger assets through the function bundle and handle both URL forms
// explicitly because Vercel may preserve or normalize the trailing slash.
app.use('/api-docs', swaggerUi.serveFiles(swaggerDocument));
app.get(['/api-docs', '/api-docs/'], swaggerUiHandler);

app.use(`${API_V1_PREFIX}/auth`, authRouter);
app.use(`${API_V1_PREFIX}/borrower`, borrowerRouter);
app.use(`${API_V1_PREFIX}/ops`, opsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
