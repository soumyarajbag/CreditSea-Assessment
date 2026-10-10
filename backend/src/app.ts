import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { swaggerDocument } from './config/swagger';
import { authRouter } from './routes/auth.routes';
import { borrowerRouter } from './routes/borrower.routes';
import { opsRouter } from './routes/ops.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';

export const app = express();
const API_V1_PREFIX = '/api/v1';

app.use(helmet());
app.use(cors({ origin: env.frontendUrl.split(',').map((origin) => origin.trim()), credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

const healthHandler = (_req: express.Request, res: express.Response) => {
  res.status(200).json({ status: 'ok', service: 'creditsea-lms-api' });
};

app.get('/health', healthHandler);
app.get(`${API_V1_PREFIX}/health`, healthHandler);

app.get('/api-docs.json', (_req, res) => {
  res.status(200).json(swaggerDocument);
});

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customSiteTitle: 'CreditSea API Documentation',
    swaggerOptions: {
      displayRequestDuration: true,
      persistAuthorization: true,
      filter: true,
      tryItOutEnabled: true,
    },
  }),
);

app.use(`${API_V1_PREFIX}/auth`, authRouter);
app.use(`${API_V1_PREFIX}/borrower`, borrowerRouter);
app.use(`${API_V1_PREFIX}/ops`, opsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
