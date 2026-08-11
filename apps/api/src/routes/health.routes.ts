import { Router } from 'express';
import { prisma } from '../lib/prisma';

export const healthRouter = Router();

// Unauthenticated liveness/readiness probe — used by docker-compose and uptime checks.
healthRouter.get('/', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, data: { status: 'ok', database: 'up' } });
  } catch {
    res.status(503).json({ success: false, error: { message: 'Database unavailable' } });
  }
});
