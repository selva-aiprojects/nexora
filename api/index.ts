// Vercel serverless entry point.
// Vercel requires function files to live in the root-level `api/` directory.
// This file imports the Express app from the server package and re-exports it.
import { app } from '../server/src/index.js';

export default app;
