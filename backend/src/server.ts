import express from 'express';

import { app } from './express-app';

// Keep a direct Express import in the entrypoint so Vercel can identify this
// file as the Express application entrypoint.
void express;

export default app;
