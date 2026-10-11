import { connectDatabase } from './config/database';
import { env } from './config/env';
import { app } from './express-app';

const start = async (): Promise<void> => {
  await connectDatabase();
  app.listen(env.port, () => {
    console.log(`LMS API listening on http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error('Failed to start API', error);
  process.exit(1);
});
