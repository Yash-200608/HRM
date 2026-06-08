import { Router } from 'express';
import path from 'node:path';

export const docsRouter = Router();

docsRouter.get('/openapi.yaml', (_req, res) => {
  const filePath = path.resolve(process.cwd(), 'openapi', 'openapi.yaml');
  res.type('text/yaml').sendFile(filePath);
});
