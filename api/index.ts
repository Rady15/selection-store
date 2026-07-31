// Vercel serverless entry point.
// Exports the Express app; the Vercel Node.js runtime turns it into a
// serverless function that handles all /api and /uploads requests.
import app from '../server.js';

export default app;
